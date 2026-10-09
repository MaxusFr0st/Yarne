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
    private readonly IR2ImageStorageService _receiptStorage;
    private readonly MakingPhotoUploads _makingPhotoUploads;

    public OrdersController(
        YarneDbContext context,
        IAdminActivityLogService activityLogs,
        IEmailService emailService,
        INovaPoshtaService novaPoshta,
        IConfiguration configuration,
        ILogger<OrdersController> logger,
        ISalesAccountingService salesAccountingService,
        IR2ImageStorageService receiptStorage,
        MakingPhotoUploads makingPhotoUploads)
    {
        _makingPhotoUploads = makingPhotoUploads;
        _receiptStorage = receiptStorage;
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
            if (order.IsForeignDelivery)
                return Ok(MapOrder(order));
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

        var clientRequestId = NormalizeClientRequestId(request.ClientRequestId, out var clientRequestIdError);
        if (clientRequestIdError != null)
            return BadRequest(new { message = clientRequestIdError });

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

        // A retry of an order that already went through: hand back that order, create nothing, send nothing.
        if (clientRequestId != null)
        {
            var already = await FindOrderByClientRequestIdAsync(clientRequestId, customerId, guestEmail, ct);
            if (already.Found)
                return already.Result!;
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
        string? foreignCode = null, foreignName = null, foreignCarrier = null;
        if (request.IsForeignDelivery)
        {
            // Abroad: no Nova Poshta (Ukraine) checks. Russia and Belarus are refused here whatever the page sent.
            var (foreignError, code, name, carrier) = ForeignDelivery.Validate(
                request.DeliveryCountryCode, request.DeliveryCountryName, request.DeliveryCarrier,
                deliveryWarehouseRef, deliveryCityName, request.DeliveryAddress);
            if (foreignError != null)
                return BadRequest(new { message = foreignError });
            foreignCode = code;
            foreignName = name;
            foreignCarrier = carrier;
        }
        else if (string.IsNullOrWhiteSpace(deliveryCityRef) || string.IsNullOrWhiteSpace(deliveryWarehouseRef) || string.IsNullOrWhiteSpace(deliveryWarehouseName))
        {
            return BadRequest(new { message = "A Nova Poshta delivery point is required." });
        }

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

        // Delivery abroad is paid in euro, from the per-product € prices read here (never from anything the page sent).
        long? eurTotalCents = null;
        if (request.IsForeignDelivery)
        {
            var (eurError, cents) = ForeignDelivery.EurTotalCents(orderItems);
            if (eurError != null)
                return BadRequest(new { message = eurError });
            eurTotalCents = cents;
        }

        var order = new Order
        {
            PaymentCurrency = request.IsForeignDelivery ? "EUR" : "UAH",
            EurTotalCents = eurTotalCents,
            OrderNumber = await OrderPublicIdentifiers.NewOrderNumberAsync(_context, now, ct),
            StatusToken = OrderPublicIdentifiers.NewStatusToken(),
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
            IsForeignDelivery = request.IsForeignDelivery,
            DeliveryCountryCode = foreignCode,
            DeliveryCountryName = foreignName,
            DeliveryCarrier = foreignCarrier,
            DeliveryPostalCode = request.IsForeignDelivery ? NormalizeOptional(request.DeliveryPostalCode) : null,
            DeliveryAddress = request.IsForeignDelivery ? NormalizeOptional(request.DeliveryAddress) : null,
            ChannelId = null,
            ChannelFeeCents = 0,
            IsChannelFeeOverridden = false,
            CurrencyCode = "UAH",
            ExchangeRateToBase = 1m,
            Locale = NormalizeLocale(request.Locale),
            ClientRequestId = clientRequestId,
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
        // Two orders placed at the same moment can pick the same day-count; the unique index rejects the second, which then takes the next one.
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await _context.SaveChangesAsync(ct);
                break;
            }
            catch (DbUpdateException)
            {
                // Two presses of Place order at once: the unique index let the first through, so this one returns that order.
                if (clientRequestId != null)
                {
                    var raced = await FindOrderByClientRequestIdAsync(clientRequestId, customerId, guestEmail, ct);
                    if (raced.Found)
                        return raced.Result!;
                }

                if (attempt >= 6 || !await OrderPublicIdentifiers.IsNumberTakenAsync(_context, order.OrderNumber, ct))
                    throw;

                order.OrderNumber = await OrderPublicIdentifiers.NewOrderNumberAsync(_context, now, ct);
            }
        }

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

    /// <summary>Null when absent; 16 to 64 characters of A-Z a-z 0-9 _ - otherwise, or an error.</summary>
    internal static string? NormalizeClientRequestId(string? raw, out string? error)
    {
        error = null;
        if (raw == null)
            return null;

        var id = raw.Trim();
        if (id.Length is < 16 or > 64 || !id.All(c => c is (>= 'A' and <= 'Z') or (>= 'a' and <= 'z') or (>= '0' and <= '9') or '_' or '-'))
        {
            error = "clientRequestId must be 16 to 64 letters, digits, underscores or hyphens.";
            return null;
        }

        return id;
    }

    /// <summary>
    /// The order a retried POST already created. Only the full random id counts (never a prefix, never the
    /// query string), and it is only returned to the same account, or for a guest to the same email, so the id
    /// cannot be used to read someone else's order. The reply is exactly the one the creator got the first time.
    /// </summary>
    private async Task<(bool Found, ActionResult<OrderDto>? Result)> FindOrderByClientRequestIdAsync(
        string clientRequestId, int? customerId, string? guestEmail, CancellationToken ct)
    {
        var existing = await BuildOrderQuery().FirstOrDefaultAsync(o => o.ClientRequestId == clientRequestId, ct);
        if (existing == null)
            return (false, null);

        var sameOwner = customerId != null
            ? existing.CustomerId == customerId
            : existing.CustomerId == null
                && string.Equals(existing.GuestEmail, guestEmail, StringComparison.OrdinalIgnoreCase);
        if (!sameOwner)
            return (true, BadRequest(new { message = "This order request id is already in use." }));

        return (true, StatusCode(StatusCodes.Status201Created, MapOrder(existing)));
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
            ForeignDelivery.ApplyAutoTransfer(lockedOrder);
            lockedOrder.CancelReason = string.Equals(canonicalStatus, "Canceled", StringComparison.Ordinal)
                ? NormalizeOptional(request.CancelReason)
                : null;
            lockedOrder.FinalizedAt = canonicalStatus is "Received" or "Canceled" ? lockedOrder.FinalizedAt ?? DateTime.UtcNow : null;
            lockedOrder.EstimatedDelivery = request.EstimatedDelivery;
            lockedOrder.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        });

        if (orderDisappeared)
            return NotFound();

        // The making-of photos are only for while the order is being made: gone as soon as it is Received or Canceled.
        if (canonicalStatus is "Received" or "Canceled")
        {
            try { await MakingPhotos.DeleteForOrderAsync(_context, _receiptStorage, id, ct); }
            catch (Exception ex) { _logger.LogError(ex, "Could not delete the making-of photos of order #{OrderId}; the daily cleanup will retry.", id); }
        }

        if (string.Equals(canonicalStatus, "Shipped", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(previousStatus, "Shipped", StringComparison.OrdinalIgnoreCase))
        {
            var defaultSenderId = _novaPoshta.DefaultSenderProfile?.Id;
            var goesAbroad = await _context.Orders.AsNoTracking().AnyAsync(o => o.Id == id && o.IsForeignDelivery, ct);
            if (defaultSenderId != null && !goesAbroad)
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

    /// <summary>Marks an order as going abroad (or back to Ukraine). Foreign orders never get an automatic Nova Poshta waybill.</summary>
    [HttpPatch("{id:int}/foreign-delivery")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> SetForeignDelivery(int id, [FromBody] SetForeignDeliveryRequest request, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();

        order.IsForeignDelivery = request.IsForeignDelivery;
        // Abroad there is only the bank transfer: a pay-on-pickup choice made before the switch no longer stands.
        if (request.IsForeignDelivery && order.PaymentChoice == "Pickup" && order.PaymentReceivedAt == null)
        {
            order.PaymentChoice = null;
            order.PaymentChoiceAt = null;
        }

        ForeignDelivery.ApplyAutoTransfer(order);
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        return Ok(MapOrder(updated!));
    }

    /// <summary>Sets or clears the tracking number typed in by hand on a foreign order, without calling Nova Poshta.</summary>
    [HttpPut("{id:int}/manual-ttn")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> SetManualTtn(int id, [FromBody] SetManualTtnRequest request, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();
        if (!order.IsForeignDelivery)
            return BadRequest(new { message = "A tracking number can be typed in by hand only on an order marked as going abroad." });
        if (!string.IsNullOrWhiteSpace(order.TtnRef))
            return BadRequest(new { message = "This order has a Nova Poshta waybill; cancel it first." });

        var number = NormalizeOptional(request.TtnNumber);
        order.TtnNumber = number;
        order.TtnCreatedAt = number == null ? null : DateTime.UtcNow;
        order.TrackingStatus = null;
        order.TrackingStatusCode = null;
        order.TrackingCheckedAt = null;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        return Ok(MapOrder(updated!));
    }

    /// <summary>Marks the bank transfer as received (a mark, not a status) and tells the customer. Only for orders the customer chose to pay by transfer.</summary>
    [HttpPost("{id:int}/payment-received")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> MarkPaymentReceived(int id, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();
        if (order.PaymentChoice != "Transfer")
            return BadRequest(new { message = "Payment can be marked received only when the customer chose to pay by transfer." });

        var firstTime = order.PaymentReceivedAt == null;
        if (firstTime)
        {
            order.PaymentReceivedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (firstTime)
            QueueOrderStatusEmail(updated!, OrderEmailEvent.PaymentConfirmed);
        return Ok(MapOrder(updated!));
    }

    /// <summary>
    /// Lets the customer choose how to pay again: clears the choice, the "I have paid" claim and the receipt file.
    /// Not possible once the payment is marked received (undo that first).
    /// </summary>
    [HttpPost("{id:int}/reset-payment-choice")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> ResetPaymentChoice(int id, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();
        if (order.PaymentReceivedAt != null)
            return BadRequest(new { message = "The payment is marked received: undo that first." });

        var receiptKey = order.ReceiptKey;
        order.PaymentChoice = null;
        order.PaymentChoiceAt = null;
        order.PaymentClaimedAt = null;
        order.ReceiptKey = null;
        order.ReceiptContentType = null;
        order.ReceiptUploadedAt = null;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        if (!string.IsNullOrEmpty(receiptKey))
            await _receiptStorage.DeletePrivateAsync(receiptKey, ct);

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        return Ok(MapOrder(updated!));
    }

    /// <summary>
    /// The owner sets how the customer pays (for example after they wrote asking to change it). Allowed until the payment is marked
    /// received. Moving away from the transfer removes the "I have paid" claim and the receipt file. Nobody is emailed.
    /// </summary>
    [HttpPost("{id:int}/payment-choice")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> SetPaymentChoice(int id, [FromBody] SetPaymentChoiceRequest request, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();
        if (order.PaymentReceivedAt != null)
            return BadRequest(new { message = "The payment is marked received: undo that first." });

        var choice = OrderStatusController.NormalizeChoice(request?.Choice);
        if (choice == null)
            return BadRequest(new { message = "Choice must be transfer or pickup." });
        if (order.IsForeignDelivery && choice == "Pickup")
            return BadRequest(new { message = "Orders delivered abroad are paid by bank transfer only." });

        if (!string.Equals(order.PaymentChoice, choice, StringComparison.Ordinal))
        {
            string? deleteKey = null;
            if (choice != "Transfer")
            {
                deleteKey = order.ReceiptKey;
                order.PaymentClaimedAt = null;
                order.ReceiptKey = null;
                order.ReceiptContentType = null;
                order.ReceiptUploadedAt = null;
            }

            order.PaymentChoice = choice;
            order.PaymentChoiceAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            if (!string.IsNullOrEmpty(deleteKey))
                await _receiptStorage.DeletePrivateAsync(deleteKey, ct);
        }

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        return Ok(MapOrder(updated!));
    }

    /// <summary>The making-of photos of an order (admin).</summary>
    [HttpGet("{id:int}/making-photos")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MakingPhotosDto>> GetMakingPhotos(int id, CancellationToken ct = default)
    {
        var order = await _context.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();
        var photos = await _context.OrderMakingPhotos.AsNoTracking().Where(p => p.OrderId == id).OrderBy(p => p.CreatedAt).ThenBy(p => p.Id).ToListAsync(ct);
        return Ok(new MakingPhotosDto
        {
            RequestedAt = order.PhotosRequestedAt,
            Photos = photos.Select(p => new MakingPhotoDto { Id = p.Id, CreatedAt = p.CreatedAt }).ToList(),
        });
    }

    /// <summary>
    /// Uploads making-of photos (multipart "files", up to 5 per order in total). The first upload after the customer asked sends them
    /// one email; later uploads send none, and neither does an upload nobody asked for.
    /// </summary>
    [HttpPost("{id:int}/making-photos")]
    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(45 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 45 * 1024 * 1024)]
    public async Task<ActionResult<MakingPhotosDto>> UploadMakingPhotos(int id, [FromForm] List<IFormFile>? files, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();

        var result = await _makingPhotoUploads.AddAsync(order, files ?? [], ct);
        if (result.Error != null)
            return BadRequest(new { message = result.Error });

        if (result.NotifyCustomer)
        {
            var full = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
            if (full != null)
                QueueOrderStatusEmail(full, OrderEmailEvent.PhotosReady);
        }

        return await GetMakingPhotos(id, ct);
    }

    [HttpDelete("{id:int}/making-photos/{photoId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MakingPhotosDto>> DeleteMakingPhoto(int id, int photoId, CancellationToken ct = default)
    {
        var photo = await _context.OrderMakingPhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.OrderId == id, ct);
        if (photo == null)
            return NotFound();
        await _receiptStorage.DeletePrivateAsync(photo.StorageKey, ct);
        _context.OrderMakingPhotos.Remove(photo);
        await _context.SaveChangesAsync(ct);
        return await GetMakingPhotos(id, ct);
    }

    [HttpGet("{id:int}/making-photos/{photoId:int}/image")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetMakingPhotoImage(int id, int photoId, CancellationToken ct = default)
    {
        var photo = await _context.OrderMakingPhotos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == photoId && p.OrderId == id, ct);
        if (photo == null)
            return NotFound();
        var file = await _receiptStorage.GetPrivateAsync(photo.StorageKey, ct);
        if (file == null)
            return NotFound();
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Value.Content, file.Value.ContentType);
    }

    /// <summary>Undoes "payment received" (a mistake): the customer may then replace the receipt again.</summary>
    [HttpDelete("{id:int}/payment-received")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> UndoPaymentReceived(int id, CancellationToken ct = default)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();

        order.PaymentReceivedAt = null;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        var updated = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        return Ok(MapOrder(updated!));
    }

    /// <summary>The receipt image the customer uploaded, streamed to the signed-in admin. The file has no public address.</summary>
    [HttpGet("{id:int}/receipt")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReceipt(int id, CancellationToken ct = default)
    {
        var order = await _context.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order?.ReceiptKey == null)
            return NotFound();

        var file = await _receiptStorage.GetPrivateAsync(order.ReceiptKey, ct);
        if (file == null)
            return NotFound();

        Response.Headers["Cache-Control"] = "private, no-store";
        return File(file.Value.Content, order.ReceiptContentType ?? file.Value.ContentType);
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
        if (order.IsForeignDelivery)
            return BadRequest(new { message = "This order is going abroad: enter its tracking number by hand instead of creating a Nova Poshta waybill." });
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

        // A foreign order's number is not a Nova Poshta one: there is nothing to look up.
        if (order.IsForeignDelivery)
            return Ok(MapOrder((await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct))!));

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
        if (order.IsForeignDelivery)
            return (false, "Foreign-delivery orders never get an automatic waybill.");

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
            .Include(o => o.MakingPhotos)
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

    private OrderDto MapOrder(Order order)
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
            OrderNumber = order.OrderNumber,
            StatusToken = order.StatusToken,
            StatusUrl = OrderLinks.StatusUrl(_configuration, order),
            PaymentChoice = order.PaymentChoice,
            PaymentChoiceAt = order.PaymentChoiceAt,
            CancelReason = order.CancelReason,
            IsForeignDelivery = order.IsForeignDelivery,
            PaymentClaimedAt = order.PaymentClaimedAt,
            PhotosRequestedAt = order.PhotosRequestedAt,
            MakingPhotoCount = order.MakingPhotos.Count,
            PaymentCurrency = order.PaymentCurrency == "EUR" ? "EUR" : "UAH",
            EurTotal = order.EurTotalCents.HasValue ? order.EurTotalCents.Value / 100m : null,
            PaymentReceivedAt = order.PaymentReceivedAt,
            ReceiptUploadedAt = order.ReceiptKey == null ? null : order.ReceiptUploadedAt,
            DeliveryCountryCode = order.DeliveryCountryCode,
            DeliveryCountryName = order.DeliveryCountryName,
            DeliveryCarrier = order.DeliveryCarrier,
            DeliveryPostalCode = order.DeliveryPostalCode,
            DeliveryAddress = order.DeliveryAddress,
            Locale = order.Locale,
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
                    WithLace = OrderItemSnapshotHelper.ResolveWithLace(i),
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

    private static string? NormalizeLocale(string? value)
    {
        var lower = value?.Trim().ToLowerInvariant();
        return lower is "en" or "uk" ? lower : null;
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

        var frontendBase = OrderLinks.FrontendBase(_configuration);
        var accountUrl = $"{frontendBase}/account";

        var apiBase = ResolvePublicApiBaseUrl().TrimEnd('/');

        // The line keeps the English names it was ordered with; the email is Ukrainian, so look the Ukrainian ones up.
        var colorNames = order.OrderItems.Select(i => i.ColorName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        var sizeNames = order.OrderItems.Select(i => i.SizeName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        var furnitureNames = order.OrderItems.Select(i => i.FurnitureColorName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        var colorUk = _context.Colors.AsNoTracking().Where(c => colorNames.Contains(c.Name) && c.NameUk != null)
            .ToDictionary(c => c.Name, c => c.NameUk!);
        var sizeUk = _context.Sizes.AsNoTracking().Where(sz => sizeNames.Contains(sz.Name) && sz.NameUk != null)
            .ToDictionary(sz => sz.Name, sz => sz.NameUk!);
        var furnitureUk = _context.FurnitureColors.AsNoTracking().Where(f => furnitureNames.Contains(f.Name) && f.NameUk != null)
            .ToDictionary(f => f.Name, f => f.NameUk!);

        return new OrderConfirmationEmailMessage
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            StatusUrl = OrderLinks.StatusUrl(_configuration, order) ?? string.Empty,
            AdminUrl = OrderLinks.AdminUrl(_configuration, order),
            TtnNumber = order.TtnNumber,
            CancelReason = order.CancelReason,
            PaymentChoice = order.PaymentChoice,
            IsForeignDelivery = order.IsForeignDelivery,
            DeliverySummary = OrderLinks.DeliverySummary(order),
            Event = emailEvent,
            CustomerName = customerName,
            CustomerEmail = customerEmail,
            ToEmail = customerEmail,
            BccEmails = [],
            AccountUrl = accountUrl,
            OrderDateUtc = order.OrderDate,
            Total = order.TotalCents / 100m,
            Locale = order.Locale,
            // Only show a EUR total when every line has a EUR snapshot — a partial total would
            // silently understate the order (same convention as the storefront's order history).
            EurTotal = order.EurTotalCents.HasValue
                ? order.EurTotalCents.Value / 100m
                : order.OrderItems.Any(i => !i.EurUnitPrice.HasValue)
                    ? null
                    : order.OrderItems.Sum(i => i.EurUnitPrice!.Value * i.Quantity),
            PaymentCurrency = order.PaymentCurrency,
            Items = order.OrderItems
                .OrderBy(i => i.Id)
                .Select(i => new OrderConfirmationEmailItem
                {
                    ProductCode = OrderItemSnapshotHelper.ResolveProductCode(i),
                    ProductName = OrderItemSnapshotHelper.ResolveProductName(i),
                    ProductImageUrl = ResolveAbsoluteImageUrl(OrderItemSnapshotHelper.ResolveProductImageUrl(i), apiBase),
                    ProductSubtitle = i.ProductSubtitle,
                    ColorName = i.ColorName,
                    ColorNameUk = i.ColorName != null && colorUk.TryGetValue(i.ColorName, out var cu) ? cu : null,
                    SizeName = i.SizeName,
                    SizeNameUk = i.SizeName != null && sizeUk.TryGetValue(i.SizeName, out var su) ? su : null,
                    FurnitureColorName = i.FurnitureColorName,
                    FurnitureColorNameUk = i.FurnitureColorName != null && furnitureUk.TryGetValue(i.FurnitureColorName, out var fu) ? fu : null,
                    WithLace = OrderItemSnapshotHelper.ResolveWithLace(i),
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    EurUnitPrice = i.EurUnitPrice,
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
            OrderNumber = source.OrderNumber,
            StatusUrl = source.StatusUrl,
            AdminUrl = source.AdminUrl,
            TtnNumber = source.TtnNumber,
            CancelReason = source.CancelReason,
            PaymentChoice = source.PaymentChoice,
            Event = source.Event,
            CustomerName = source.CustomerName,
            CustomerEmail = source.CustomerEmail,
            ToEmail = toEmail,
            BccEmails = [],
            AccountUrl = source.AccountUrl,
            OrderDateUtc = source.OrderDateUtc,
            Total = source.Total,
            EurTotal = source.EurTotal,
            PaymentCurrency = source.PaymentCurrency,
            Items = source.Items
                .Select(i => new OrderConfirmationEmailItem
                {
                    ProductCode = i.ProductCode,
                    ProductName = i.ProductName,
                    ProductImageUrl = i.ProductImageUrl,
                    ProductSubtitle = i.ProductSubtitle,
                    ColorName = i.ColorName,
                    ColorNameUk = i.ColorNameUk,
                    SizeName = i.SizeName,
                    SizeNameUk = i.SizeNameUk,
                    FurnitureColorName = i.FurnitureColorName,
                    FurnitureColorNameUk = i.FurnitureColorNameUk,
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
