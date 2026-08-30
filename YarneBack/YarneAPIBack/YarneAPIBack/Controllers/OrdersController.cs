using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private static readonly Dictionary<string, string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        ["pending"] = "Pending",
        ["accepted"] = "Accepted",
        ["confirmed"] = "Accepted",
        ["processing"] = "Accepted",
        ["inproduction"] = "InProduction",
        ["in production"] = "InProduction",
        ["made"] = "Made",
        ["shipped"] = "Shipped",
        ["received"] = "Received",
        ["delivered"] = "Received",
        ["canceled"] = "Canceled",
        ["cancelled"] = "Canceled",
    };

    private readonly YarneDbContext _context;
    private readonly IAdminActivityLogService _activityLogs;
    private readonly IEmailService _emailService;
    private readonly INovaPoshtaService _novaPoshta;
    private readonly ILogger<OrdersController> _logger;
    private readonly IConfiguration _configuration;
    private readonly ISalesAccountingService _salesAccountingService;

    public OrdersController(
        YarneDbContext context,
        IAdminActivityLogService activityLogs,
        IEmailService emailService,
        INovaPoshtaService novaPoshta,
        IConfiguration configuration,
        ILogger<OrdersController> logger,
        ISalesAccountingService salesAccountingService)
    {
        _context = context;
        _activityLogs = activityLogs;
        _emailService = emailService;
        _novaPoshta = novaPoshta;
        _configuration = configuration;
        _logger = logger;
        _salesAccountingService = salesAccountingService;
    }

    [HttpGet("my")]
    [Authorize]
    [ProducesResponseType(typeof(IEnumerable<OrderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetMyOrders(CancellationToken ct = default)
    {
        var customerId = GetCurrentCustomerId();
        if (customerId == null)
            return Unauthorized();

        var orders = await BuildOrderQuery()
            .Where(o => o.CustomerId == customerId.Value)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(ct);

        return Ok(orders.Select(MapOrder));
    }

    [HttpGet("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> GetOrderById(int id, CancellationToken ct = default)
    {
        var customerId = GetCurrentCustomerId();
        if (customerId == null)
            return Unauthorized();

        var order = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();

        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && order.CustomerId != customerId.Value)
            return Forbid();

        return Ok(MapOrder(order));
    }

    /// <summary>
    /// Looks up one of the caller's own orders by Nova Poshta tracking number and refreshes
    /// its live status. Scoped to the caller's own orders — a logged-in customer cannot use
    /// this to peek at someone else's shipment by guessing a TTN.
    /// </summary>
    [HttpGet("track")]
    [Authorize]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> TrackByTtn([FromQuery] string ttn, CancellationToken ct = default)
    {
        var customerId = GetCurrentCustomerId();
        if (customerId == null)
            return Unauthorized();

        var normalizedTtn = ttn?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedTtn))
            return BadRequest(new { message = "Tracking number is required." });

        var order = await BuildOrderQuery().FirstOrDefaultAsync(
            o => o.CustomerId == customerId.Value && o.TtnNumber == normalizedTtn,
            ct);
        if (order == null)
            return NotFound(new { message = "No order with this tracking number was found on your account." });

        var orderId = order.Id;
        try
        {
            var status = await _novaPoshta.GetTrackingStatusAsync(order.TtnNumber!, ct);
            if (status != null)
            {
                var tracked = await _context.Orders.FirstAsync(o => o.Id == orderId, ct);
                tracked.TrackingStatus = status.Status;
                tracked.TrackingStatusCode = status.StatusCode;
                tracked.TrackingCheckedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(ct);
                order = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == orderId, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh Nova Poshta tracking for order #{OrderId} via TTN lookup.", orderId);
        }

        return Ok(MapOrder(order!));
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<OrderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAllOrders(CancellationToken ct = default)
    {
        try
        {
            return Ok(await LoadAdminOrdersAsync(ct));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin orders list failed; attempting schema self-heal.");
            await OrderItemSchemaPatches.ForceEnsureSnapshotColumnsAsync(_context, _logger, ct);
            var orders = await LoadAdminOrdersAsync(ct);
            return Ok(orders);
        }
    }

    private async Task<IEnumerable<OrderDto>> LoadAdminOrdersAsync(CancellationToken ct)
    {
        var orders = await BuildAdminOrderListQuery()
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(ct);

        return orders.Select(MapOrder);
    }

    [HttpGet("summary")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(AdminOrdersSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminOrdersSummaryDto>> GetOrdersSummary(CancellationToken ct = default)
    {
        var summary = await _context.Orders
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new AdminOrdersSummaryDto
            {
                TotalOrders = g.Count(),
                TotalRevenue = g.Sum(o => o.TotalCents) / 100m,
                PendingOrders = g.Count(o => o.Status == "Pending"),
            })
            .FirstOrDefaultAsync(ct);

        return Ok(summary ?? new AdminOrdersSummaryDto());
    }

    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] CreateOrderRequest request, CancellationToken ct = default)
    {
        try
        {
            return await CreateOrderCore(request, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create order for customer.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to place order. Please try again." });
        }
    }

    private async Task<ActionResult<OrderDto>> CreateOrderCore(CreateOrderRequest request, CancellationToken ct)
    {
        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { message = "Order must include at least one item." });

        var customerId = GetCurrentCustomerId();
        Customer? customer = null;
        string? guestEmail = null;

        if (customerId != null)
        {
            customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == customerId.Value, ct);
            if (customer == null)
                return BadRequest(new { message = "Customer account was not found." });
        }
        else
        {
            guestEmail = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(guestEmail))
                return BadRequest(new { message = "Email is required to place an order." });
        }

        var contactPhone = NormalizePhone(request.PhoneNumber);
        if (string.IsNullOrWhiteSpace(contactPhone))
            return BadRequest(new { message = "Phone number is required." });

        var recipientFirstName = request.RecipientFirstName.Trim();
        var recipientLastName = request.RecipientLastName.Trim();
        var recipientPhone = NormalizePhone(request.RecipientPhone);
        if (string.IsNullOrWhiteSpace(recipientFirstName) || string.IsNullOrWhiteSpace(recipientLastName) || string.IsNullOrWhiteSpace(recipientPhone))
            return BadRequest(new { message = "Recipient name and phone are required." });

        var deliveryCityRef = request.DeliveryCityRef.Trim();
        var deliveryCityName = request.DeliveryCityName.Trim();
        var deliveryWarehouseRef = request.DeliveryWarehouseRef.Trim();
        var deliveryWarehouseName = request.DeliveryWarehouseName.Trim();
        if (string.IsNullOrWhiteSpace(deliveryCityRef) || string.IsNullOrWhiteSpace(deliveryWarehouseRef))
            return BadRequest(new { message = "A Nova Poshta delivery point is required." });

        if (request.ShippingAddrId.HasValue)
        {
            var ownsAddress = customerId != null && await _context.CustomerAddresses.AnyAsync(
                a => a.Id == request.ShippingAddrId.Value && a.CustomerId == customerId.Value,
                ct
            );
            if (!ownsAddress)
                return BadRequest(new { message = "Shipping address does not belong to the current customer." });
        }

        int paymentMethodId;
        if (request.PaymentMethodId.HasValue)
        {
            var paymentExists = await _context.PaymentMethods.AnyAsync(pm => pm.Id == request.PaymentMethodId.Value, ct);
            if (!paymentExists)
                return BadRequest(new { message = "Selected payment method was not found." });
            paymentMethodId = request.PaymentMethodId.Value;
        }
        else
        {
            var fallbackPaymentMethod = await _context.PaymentMethods
                .OrderBy(pm => pm.Id)
                .Select(pm => pm.Id)
                .FirstOrDefaultAsync(ct);

            if (fallbackPaymentMethod == 0)
            {
                var defaultPaymentMethod = new PaymentMethod { Name = "Card" };
                _context.PaymentMethods.Add(defaultPaymentMethod);
                await _context.SaveChangesAsync(ct);
                fallbackPaymentMethod = defaultPaymentMethod.Id;
            }

            paymentMethodId = fallbackPaymentMethod;
        }

        var requestedCodes = request.Items
            .Select(i => i.ProductIdOrCode.Trim())
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var numericIds = requestedCodes
            .Where(v => int.TryParse(v, out _))
            .Select(int.Parse)
            .Distinct()
            .ToList();

        var codeIds = requestedCodes
            .Where(v => !int.TryParse(v, out _))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var products = await _context.Products
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
            .Where(p => numericIds.Contains(p.Id) || codeIds.Contains(p.ProductCode))
            .ToListAsync(ct);

        var productById = products.ToDictionary(p => p.Id);
        var productByCode = products
            .GroupBy(p => p.ProductCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var orderItems = new List<OrderItem>();
        var now = DateTime.UtcNow;
        foreach (var item in request.Items)
        {
            var productKey = item.ProductIdOrCode.Trim();
            if (string.IsNullOrWhiteSpace(productKey))
                return BadRequest(new { message = "Each order item requires a product id or code." });

            Product? product = null;
            if (int.TryParse(productKey, out var numericId))
                productById.TryGetValue(numericId, out product);
            else
                productByCode.TryGetValue(productKey, out product);

            if (product == null)
                return BadRequest(new { message = $"Product '{productKey}' was not found." });

            if (!product.IsActive || product.IsVoid || product.IsInternalComponent)
                return BadRequest(new { message = $"Product '{productKey}' is not available." });

            var productColor = item.ColorId.HasValue
                ? product.ProductColors.FirstOrDefault(pc => pc.ColorId == item.ColorId.Value)
                : null;
            var wantsLace = product.Lace && item.WithLace == true;
            var unitPrice = wantsLace
                ? (productColor?.PriceWithLace ?? productColor?.Price ?? product.Price)
                : (productColor?.Price ?? product.Price);
            var eurUnitPrice = wantsLace
                ? (productColor?.EurPriceWithLace ?? productColor?.EurPrice ?? product.EurPrice)
                : (productColor?.EurPrice ?? product.EurPrice);

            var orderItem = new OrderItem
            {
                Quantity = item.Quantity,
                UnitPrice = unitPrice,
                EurUnitPrice = eurUnitPrice,
                ListedPriceCents = checked((long)decimal.Round(unitPrice * 100m, 0, MidpointRounding.AwayFromZero)),
                NetPriceCents = checked((long)decimal.Round(unitPrice * 100m, 0, MidpointRounding.AwayFromZero)),
                UnitCogsCents = 0,
                VatAmountCents = 0,
                CreatedBy = customerId,
                CreatedAt = now,
                UpdatedAt = now,
                ProductSubtitle = NormalizeOptional(item.ProductSubtitle),
                ColorName = NormalizeOptional(item.ColorName),
                FurnitureColorName = NormalizeOptional(item.FurnitureColorName),
                SizeName = NormalizeOptional(item.SizeName),
                WithLace = product.Lace && item.WithLace == true,
            };
            OrderItemSnapshotHelper.ApplyProductSnapshot(orderItem, product);
            orderItems.Add(orderItem);
        }

        var orderTotalCents = orderItems.Sum(i => checked(i.ListedPriceCents * i.Quantity));
        var order = new Order
        {
            CustomerId = customerId,
            GuestEmail = guestEmail,
            PaymentMethodId = paymentMethodId,
            ShippingAddrId = request.ShippingAddrId,
            RecipientFirstName = recipientFirstName,
            RecipientLastName = recipientLastName,
            RecipientPhone = recipientPhone,
            DeliveryCityRef = deliveryCityRef,
            DeliveryCityName = deliveryCityName,
            DeliveryWarehouseRef = deliveryWarehouseRef,
            DeliveryWarehouseName = deliveryWarehouseName,
            ChannelId = null,
            ChannelFeeCents = 0,
            IsChannelFeeOverridden = false,
            CurrencyCode = "UAH",
            ExchangeRateToBase = 1m,
            Status = "Pending",
            TotalCents = orderTotalCents,
            OrderDate = now,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedBy = customerId,
            OrderItems = orderItems,
        };

        if (customer != null)
        {
            customer.PhoneNumber = contactPhone;
            _context.Entry(customer).Property(c => c.PhoneNumber).IsModified = true;
        }
        _context.Orders.Add(order);
        await _context.SaveChangesAsync(ct);

        var createdOrder = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == order.Id, ct);
        if (createdOrder == null)
        {
            _logger.LogWarning("Order #{OrderId} was saved but could not be reloaded.", order.Id);
            return StatusCode(StatusCodes.Status201Created, MapOrder(order));
        }

        try
        {
            QueueOrderStatusEmail(createdOrder, OrderEmailEvent.Received);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Order #{OrderId} was created but confirmation email could not be queued.", order.Id);
        }

        return StatusCode(StatusCodes.Status201Created, MapOrder(createdOrder));
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequest request, CancellationToken ct = default)
    {
        return await UpdateOrderStatusCore(id, request, ct);
    }

    private async Task<ActionResult<OrderDto>> UpdateOrderStatusCore(int id, UpdateOrderStatusRequest request, CancellationToken ct)
    {
        var normalized = request.Status.Trim();
        if (!AllowedStatuses.TryGetValue(normalized, out var canonicalStatus))
            return BadRequest(new { message = "Unsupported order status." });

        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();

        var previousStatus = order.Status;

        // Row-level lock so concurrent status writes on the same order serialize rather than
        // silently last-write-win.
        bool orderDisappeared = false;
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.RepeatableRead,
                ct);
            var lockedOrder = await _context.Orders
                .FromSqlInterpolated($"""SELECT * FROM "Order" WHERE "Id" = {id} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (lockedOrder is null)
            {
                orderDisappeared = true;
                await transaction.RollbackAsync(ct);
                return;
            }

            previousStatus = lockedOrder.Status;
            lockedOrder.Status = canonicalStatus;
            lockedOrder.EstimatedDelivery = request.EstimatedDelivery;
            lockedOrder.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        });

        if (orderDisappeared)
            return NotFound();

        if (string.Equals(canonicalStatus, "Shipped", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(previousStatus, "Shipped", StringComparison.OrdinalIgnoreCase))
        {
            var defaultSenderId = _novaPoshta.DefaultSenderProfile?.Id;
            if (defaultSenderId != null)
                await CreateWaybillForOrderAsync(id, defaultSenderId, senderAddressOverride: null, ct);
        }

        var updatedOrder = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (updatedOrder == null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Order was updated but could not be loaded." });

        // If admin "confirms" an order (Pending -> Accepted), send the same confirmation email
        // that is sent when the order is initially placed.
        if (!string.Equals(previousStatus, canonicalStatus, StringComparison.OrdinalIgnoreCase))
        {
            var statusEmailEvent = canonicalStatus switch
            {
                "Accepted" => OrderEmailEvent.Confirmed,
                "Shipped" => OrderEmailEvent.Shipped,
                "Canceled" => OrderEmailEvent.Canceled,
                _ => (OrderEmailEvent?)null,
            };

            if (statusEmailEvent.HasValue)
                QueueOrderStatusEmail(updatedOrder, statusEmailEvent.Value);

        }

        // Marking an order Received is a fulfillment fact and must succeed regardless of
        // accounting state — auto-composing the Sales-tab entry never blocks it; failures are
        // only logged for manual follow-up.
        if (string.Equals(canonicalStatus, "Received", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var (composeActorId, _) = AdminActivityLogHelper.GetActor(HttpContext);
                await _salesAccountingService.ComposeReceivedOrderAsync(id, composeActorId, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to auto-compose accounting sale for order #{OrderId} after marking Received.", id);
            }
        }

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "order",
            "updated",
            $"Order #{id} status: {previousStatus} → {canonicalStatus}",
            id.ToString(),
            $"Order #{id}",
            new
            {
                orderId = id,
                previousStatus,
                newStatus = canonicalStatus,
                estimatedDelivery = request.EstimatedDelivery,
                customerEmail = updatedOrder.Customer?.Email ?? updatedOrder.GuestEmail,
                total = updatedOrder.TotalCents / 100m,
            },
            actorUserId,
            actorEmail,
            ct);

        return Ok(MapOrder(updatedOrder));
    }

    [HttpGet("nova-poshta/senders")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<NovaPoshtaSenderProfileDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<NovaPoshtaSenderProfileDto>> GetNovaPoshtaSenders()
    {
        var defaultId = _novaPoshta.DefaultSenderProfile?.Id;
        return Ok(_novaPoshta.SenderProfiles.Select(p => new NovaPoshtaSenderProfileDto
        {
            Id = p.Id,
            Label = p.Label,
            IsDefault = p.Id == defaultId,
            DefaultCityRef = p.DefaultCityRef,
            DefaultCityName = p.DefaultCityName,
            DefaultWarehouseRef = p.DefaultWarehouseRef,
            DefaultWarehouseName = p.DefaultWarehouseName,
        }));
    }

    [HttpPost("{id:int}/ttn")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<OrderDto>> CreateWaybill(int id, [FromBody] CreateWaybillRequest? request, CancellationToken ct = default)
    {
        if (!_novaPoshta.IsConfigured)
            return BadRequest(new { message = "Nova Poshta is not configured on this server." });

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();
        if (!string.IsNullOrWhiteSpace(order.TtnNumber))
            return BadRequest(new { message = "This order already has a waybill." });

        var senderProfileId = string.IsNullOrWhiteSpace(request?.SenderProfileId)
            ? _novaPoshta.DefaultSenderProfile?.Id
            : request.SenderProfileId;
        if (senderProfileId == null)
            return BadRequest(new { message = "No Nova Poshta sender is configured." });

        var senderAddressOverride = BuildSenderAddressOverride(request);

        var (ok, error) = await CreateWaybillForOrderAsync(id, senderProfileId, senderAddressOverride, ct);
        if (!ok)
            return StatusCode(StatusCodes.Status502BadGateway, new { message = error ?? "Nova Poshta rejected the waybill request." });

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        return Ok(MapOrder(updated!));
    }

    [HttpDelete("{id:int}/ttn")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<OrderDto>> CancelWaybill(int id, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();
        if (string.IsNullOrWhiteSpace(order.TtnRef))
            return BadRequest(new { message = "This order has no waybill to cancel." });

        // Waybills created before TtnSenderProfileId was tracked don't know which sender made
        // them -- fall back to trying every configured sender, since Nova Poshta only lets the
        // creating account delete its own documents and rejects the wrong one harmlessly.
        var candidateSenderIds = string.IsNullOrWhiteSpace(order.TtnSenderProfileId)
            ? _novaPoshta.SenderProfiles.Select(p => p.Id).ToList()
            : [order.TtnSenderProfileId];

        var deleted = false;
        Exception? lastError = null;
        foreach (var senderId in candidateSenderIds)
        {
            try
            {
                deleted = await _novaPoshta.DeleteWaybillAsync(senderId, order.TtnRef, ct);
                if (deleted)
                    break;
            }
            catch (Exception ex)
            {
                lastError = ex;
            }
        }

        if (!deleted)
        {
            _logger.LogError(lastError, "Failed to cancel Nova Poshta waybill for order #{OrderId}.", id);
            return StatusCode(StatusCodes.Status502BadGateway, new { message = lastError?.Message ?? "Nova Poshta did not confirm the cancellation." });
        }

        order.TtnNumber = null;
        order.TtnRef = null;
        order.TtnCreatedAt = null;
        order.TtnSenderProfileId = null;
        order.TrackingStatus = null;
        order.TrackingStatusCode = null;
        order.TrackingCheckedAt = null;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        return Ok(MapOrder(updated!));
    }

    [HttpGet("nova-poshta/shipping-price")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(decimal), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<decimal>> GetShippingPrice([FromQuery] string cityRef, [FromQuery] decimal cost, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(cityRef))
            return BadRequest(new { message = "cityRef is required." });

        var price = await _novaPoshta.GetShippingPriceAsync(cityRef, cost, ct);
        if (price == null)
            return BadRequest(new { message = "Could not estimate shipping price." });

        return Ok(price.Value);
    }

    private static NovaPoshtaSenderAddress? BuildSenderAddressOverride(CreateWaybillRequest? request)
    {
        if (request == null
            || string.IsNullOrWhiteSpace(request.SenderCityRef)
            || string.IsNullOrWhiteSpace(request.SenderWarehouseRef))
        {
            return null;
        }

        return new NovaPoshtaSenderAddress(request.SenderCityRef.Trim(), request.SenderWarehouseRef.Trim());
    }

    [HttpPost("{id:int}/tracking")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> RefreshTracking(int id, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();
        if (string.IsNullOrWhiteSpace(order.TtnNumber))
            return BadRequest(new { message = "This order has no waybill yet." });

        try
        {
            var status = await _novaPoshta.GetTrackingStatusAsync(order.TtnNumber, ct);
            if (status != null)
            {
                order.TrackingStatus = status.Status;
                order.TrackingStatusCode = status.StatusCode;
                order.TrackingCheckedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh Nova Poshta tracking for order #{OrderId}.", id);
        }

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        return Ok(MapOrder(updated!));
    }

    /// <summary>
    /// Creates a Nova Poshta waybill for the given order if it has a delivery point and no
    /// waybill yet. Swallows Nova Poshta errors (logged) so callers driven by a status
    /// transition never fail the transition itself; the explicit ttn endpoint surfaces them.
    /// </summary>
    private async Task<(bool Ok, string? Error)> CreateWaybillForOrderAsync(
        int orderId,
        string senderProfileId,
        NovaPoshtaSenderAddress? senderAddressOverride,
        CancellationToken ct)
    {
        if (!_novaPoshta.IsConfigured)
            return (false, "Nova Poshta is not configured on this server.");

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order == null || !string.IsNullOrWhiteSpace(order.TtnNumber))
            return (true, null);

        if (string.IsNullOrWhiteSpace(order.DeliveryCityRef)
            || string.IsNullOrWhiteSpace(order.DeliveryWarehouseRef)
            || string.IsNullOrWhiteSpace(order.RecipientFirstName)
            || string.IsNullOrWhiteSpace(order.RecipientLastName)
            || string.IsNullOrWhiteSpace(order.RecipientPhone))
        {
            const string message = "Order is missing recipient or delivery point details.";
            _logger.LogWarning("Skipping Nova Poshta waybill for order #{OrderId}: {Message}", orderId, message);
            return (false, message);
        }

        try
        {
            var waybill = await _novaPoshta.CreateWaybillAsync(
                senderProfileId,
                senderAddressOverride,
                order.RecipientFirstName,
                order.RecipientLastName,
                order.RecipientPhone,
                order.DeliveryCityRef,
                order.DeliveryWarehouseRef,
                order.TotalCents / 100m,
                ct);

            order.TtnNumber = waybill.TtnNumber;
            order.TtnRef = waybill.TtnRef;
            order.TtnCreatedAt = DateTime.UtcNow;
            order.TtnSenderProfileId = senderProfileId;
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Nova Poshta waybill for order #{OrderId}.", orderId);
            return (false, ex.Message);
        }
    }

    private IQueryable<Order> BuildAdminOrderListQuery()
    {
        return _context.Orders
            .AsNoTracking()
            .AsSplitQuery()
            .Include(o => o.Customer)
            .Include(o => o.PaymentMethod)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                    .ThenInclude(p => p!.ProductImages)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                    .ThenInclude(p => p!.ProductColors)
                        .ThenInclude(pc => pc.Images)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                    .ThenInclude(p => p!.ProductColors)
                        .ThenInclude(pc => pc.SizeImages);
    }

    private IQueryable<Order> BuildOrderQuery()
    {
        return _context.Orders
            .AsNoTracking()
            .AsSplitQuery()
            .Include(o => o.Customer)
            .Include(o => o.PaymentMethod)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                    .ThenInclude(p => p!.ProductImages)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                    .ThenInclude(p => p!.ProductColors)
                        .ThenInclude(pc => pc.Images)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                    .ThenInclude(p => p!.ProductColors)
                        .ThenInclude(pc => pc.SizeImages);
    }

    private int? GetCurrentCustomerId()
    {
        var customerIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(ClaimTypes.Sid)
            ?? User.FindFirstValue("sub");

        return int.TryParse(customerIdRaw, out var customerId) ? customerId : null;
    }

    private static OrderDto MapOrder(Order order)
    {
        var customer = order.Customer;
        string customerName;
        if (customer != null)
        {
            customerName = $"{customer.FirstName} {customer.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(customerName))
                customerName = customer.UserName ?? customer.Email ?? "Customer";
        }
        else
        {
            customerName = $"{order.RecipientFirstName} {order.RecipientLastName}".Trim();
            if (string.IsNullOrWhiteSpace(customerName))
                customerName = "Guest";
        }

        return new OrderDto
        {
            Id = order.Id,
            CustomerId = order.CustomerId,
            CustomerName = customerName,
            CustomerEmail = customer?.Email ?? order.GuestEmail ?? string.Empty,
            CustomerPhoneNumber = customer?.PhoneNumber ?? order.RecipientPhone,
            Total = order.TotalCents / 100m,
            Status = order.Status,
            OrderDate = order.OrderDate,
            EstimatedDelivery = order.EstimatedDelivery,
            PaymentMethodId = order.PaymentMethodId,
            PaymentMethodName = order.PaymentMethod?.Name ?? "Card",
            ShippingAddrId = order.ShippingAddrId,
            RecipientFirstName = order.RecipientFirstName,
            RecipientLastName = order.RecipientLastName,
            RecipientPhone = order.RecipientPhone,
            DeliveryCityRef = order.DeliveryCityRef,
            DeliveryCityName = order.DeliveryCityName,
            DeliveryWarehouseRef = order.DeliveryWarehouseRef,
            DeliveryWarehouseName = order.DeliveryWarehouseName,
            TtnNumber = order.TtnNumber,
            TtnCreatedAt = order.TtnCreatedAt,
            TrackingStatus = order.TrackingStatus,
            TrackingCheckedAt = order.TrackingCheckedAt,
            Items = order.OrderItems
                .OrderBy(i => i.Id)
                .Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ParentOrderItemId = i.ParentOrderItemId,
                    ProductCode = OrderItemSnapshotHelper.ResolveProductCode(i),
                    ProductName = OrderItemSnapshotHelper.ResolveProductName(i),
                    ProductImageUrl = OrderItemSnapshotHelper.ResolveProductImageUrl(i),
                    ProductSubtitle = i.ProductSubtitle,
                    ColorName = i.ColorName,
                    FurnitureColorName = i.FurnitureColorName,
                    SizeName = i.SizeName,
                    WithLace = i.WithLace,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.UnitPrice * i.Quantity,
                    EurUnitPrice = i.EurUnitPrice,
                    EurLineTotal = i.EurUnitPrice.HasValue ? i.EurUnitPrice * i.Quantity : null,
                })
                .ToList(),
        };
    }

    private void QueueOrderStatusEmail(Order order, OrderEmailEvent emailEvent)
    {
        var recipientEmail = order.Customer?.Email ?? order.GuestEmail;
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            _logger.LogWarning(
                "Skipping order status email for order #{OrderId}: no email on file.",
                order.Id);
            return;
        }

        OrderConfirmationEmailMessage message;
        try
        {
            message = BuildOrderStatusMessage(order, emailEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build order status email for order #{OrderId}.", order.Id);
            return;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                _logger.LogInformation(
                    "Sending order status email ({Event}) for order #{OrderId} to {Email}.",
                    message.Event,
                    order.Id,
                    message.ToEmail);
                await _emailService.SendOrderConfirmationAsync(message, CancellationToken.None);

                if (message.Event == OrderEmailEvent.Received)
                {
                    var notifyEmail = ResolveOrderReceivedNotifyEmail();
                    if (!string.IsNullOrWhiteSpace(notifyEmail)
                        && !string.Equals(notifyEmail, message.ToEmail, StringComparison.OrdinalIgnoreCase))
                    {
                        var internalMessage = CloneMessageForRecipient(message, notifyEmail);
                        internalMessage.Event = OrderEmailEvent.InternalPlacedNotification;
                        _logger.LogInformation(
                            "Sending internal order placed notification for order #{OrderId} to {Email}.",
                            order.Id,
                            notifyEmail);
                        await _emailService.SendOrderConfirmationAsync(internalMessage, CancellationToken.None);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while sending order status email for order #{OrderId}.",
                    order.Id);
            }
        });
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }

    private static string? NormalizePhone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        if (trimmed.Length < 8 || trimmed.Length > 32) return null;
        return trimmed;
    }

    private OrderConfirmationEmailMessage BuildOrderStatusMessage(Order order, OrderEmailEvent emailEvent)
    {
        var customer = order.Customer;
        string customerName;
        string customerEmail;
        if (customer != null)
        {
            customerName = $"{customer.FirstName} {customer.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(customerName))
                customerName = customer.UserName ?? customer.Email ?? "Customer";
            customerEmail = customer.Email ?? string.Empty;
        }
        else
        {
            customerName = $"{order.RecipientFirstName} {order.RecipientLastName}".Trim();
            if (string.IsNullOrWhiteSpace(customerName))
                customerName = "Customer";
            customerEmail = order.GuestEmail ?? throw new InvalidOperationException("Guest order is missing an email.");
        }

        var frontendBase = (_configuration["FRONTEND_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("FRONTEND_BASE_URL")
            ?? "https://yarne-acc.com").Trim().TrimEnd('/');
        var accountUrl = $"{frontendBase}/account";

        var apiBase = ResolvePublicApiBaseUrl().TrimEnd('/');

        return new OrderConfirmationEmailMessage
        {
            OrderId = order.Id,
            Event = emailEvent,
            CustomerName = customerName,
            CustomerEmail = customerEmail,
            ToEmail = customerEmail,
            BccEmails = [],
            AccountUrl = accountUrl,
            OrderDateUtc = order.OrderDate,
            Total = order.TotalCents / 100m,
            Items = order.OrderItems
                .OrderBy(i => i.Id)
                .Select(i => new OrderConfirmationEmailItem
                {
                    ProductCode = OrderItemSnapshotHelper.ResolveProductCode(i),
                    ProductName = OrderItemSnapshotHelper.ResolveProductName(i),
                    ProductImageUrl = ResolveAbsoluteImageUrl(OrderItemSnapshotHelper.ResolveProductImageUrl(i), apiBase),
                    ProductSubtitle = i.ProductSubtitle,
                    ColorName = i.ColorName,
                    SizeName = i.SizeName,
                    WithLace = i.WithLace,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                })
                .ToList(),
        };
    }

    private string? ResolveOrderReceivedNotifyEmail()
    {
        var email = (_configuration["ORDER_RECEIVED_NOTIFY_EMAIL"]
            ?? Environment.GetEnvironmentVariable("ORDER_RECEIVED_NOTIFY_EMAIL"))?.Trim();

        if (string.IsNullOrWhiteSpace(email))
        {
            _logger.LogWarning("ORDER_RECEIVED_NOTIFY_EMAIL is not configured; internal order notification will be skipped.");
            return null;
        }

        return email;
    }

    private static OrderConfirmationEmailMessage CloneMessageForRecipient(OrderConfirmationEmailMessage source, string toEmail)
    {
        return new OrderConfirmationEmailMessage
        {
            OrderId = source.OrderId,
            Event = source.Event,
            CustomerName = source.CustomerName,
            CustomerEmail = source.CustomerEmail,
            ToEmail = toEmail,
            BccEmails = [],
            AccountUrl = source.AccountUrl,
            OrderDateUtc = source.OrderDateUtc,
            Total = source.Total,
            Items = source.Items
                .Select(i => new OrderConfirmationEmailItem
                {
                    ProductCode = i.ProductCode,
                    ProductName = i.ProductName,
                    ProductImageUrl = i.ProductImageUrl,
                    ProductSubtitle = i.ProductSubtitle,
                    ColorName = i.ColorName,
                    SizeName = i.SizeName,
                    WithLace = i.WithLace,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                })
                .ToList(),
        };
    }

    private string ResolvePublicApiBaseUrl()
    {
        var configured = _configuration["PUBLIC_API_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("PUBLIC_API_BASE_URL");
        if (!string.IsNullOrWhiteSpace(configured))
            return configured.Trim();

        var req = HttpContext?.Request;
        if (req == null) return "https://mindful-flexibility-production.up.railway.app";
        return $"{req.Scheme}://{req.Host.Value}";
    }

    private static string? ResolveAbsoluteImageUrl(string? raw, string apiBase)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var value = raw.Trim();
        if (Uri.TryCreate(value, UriKind.Absolute, out _))
            return value;
        if (!value.StartsWith("/", StringComparison.Ordinal))
            value = "/" + value;
        return apiBase + value;
    }
}
