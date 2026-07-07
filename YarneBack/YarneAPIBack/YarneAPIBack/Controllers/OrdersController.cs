using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private const string DefaultOrderReceivedNotifyEmail = "anastasiia.moroz.yarne@gmail.com";

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
    private readonly ILogger<OrdersController> _logger;
    private readonly IConfiguration _configuration;

    public OrdersController(
        YarneDbContext context,
        IAdminActivityLogService activityLogs,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<OrdersController> logger)
    {
        _context = context;
        _activityLogs = activityLogs;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("my")]
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

    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<OrderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAllOrders(CancellationToken ct = default)
    {
        var orders = await BuildOrderQuery()
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(ct);

        return Ok(orders.Select(MapOrder));
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
                TotalRevenue = g.Sum(o => o.Total),
                PendingOrders = g.Count(o => o.Status == "Pending"),
            })
            .FirstOrDefaultAsync(ct);

        return Ok(summary ?? new AdminOrdersSummaryDto());
    }

    [HttpPost]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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
        if (customerId == null)
            return Unauthorized();

        var customerExists = await _context.Customers.AnyAsync(c => c.Id == customerId.Value, ct);
        if (!customerExists)
            return BadRequest(new { message = "Customer account was not found." });

        if (request.ShippingAddrId.HasValue)
        {
            var ownsAddress = await _context.CustomerAddresses.AnyAsync(
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
            .Where(p => numericIds.Contains(p.Id) || codeIds.Contains(p.ProductCode))
            .ToListAsync(ct);

        var productById = products.ToDictionary(p => p.Id);
        var productByCode = products
            .GroupBy(p => p.ProductCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var requestedCountryIds = request.Items
            .Where(i => i.CountryId.HasValue)
            .Select(i => i.CountryId!.Value)
            .Distinct()
            .ToList();

        var existingCountryIds = requestedCountryIds.Count == 0
            ? new HashSet<int>()
            : (await _context.Countries
                .Where(c => requestedCountryIds.Contains(c.Id))
                .Select(c => c.Id)
                .ToListAsync(ct))
                .ToHashSet();

        if (existingCountryIds.Count != requestedCountryIds.Count)
            return BadRequest(new { message = "One or more countries in order items were not found." });

        var orderItems = new List<OrderItem>();
        var quantityByProductId = new Dictionary<int, int>();
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

            if (!product.IsActive)
                return BadRequest(new { message = $"Product '{productKey}' is not available." });

            orderItems.Add(new OrderItem
            {
                ProductId = product.Id,
                CountryId = item.CountryId,
                Quantity = item.Quantity,
                UnitPrice = product.Price,
                ProductSubtitle = NormalizeOptional(item.ProductSubtitle),
                ColorName = NormalizeOptional(item.ColorName),
                SizeName = NormalizeOptional(item.SizeName),
                WithLace = item.WithLace,
            });

            quantityByProductId[product.Id] = quantityByProductId.GetValueOrDefault(product.Id) + item.Quantity;
        }

        var orderTotal = orderItems.Sum(i => i.UnitPrice * i.Quantity);
        var order = new Order
        {
            CustomerId = customerId.Value,
            PaymentMethodId = paymentMethodId,
            ShippingAddrId = request.ShippingAddrId,
            Status = "Pending",
            Total = orderTotal,
            OrderDate = DateTime.UtcNow,
            OrderItems = orderItems,
        };

        // Single SaveChanges is atomic; explicit transactions break Npgsql retry strategy on Railway.
        foreach (var (productId, requestedQty) in quantityByProductId)
        {
            if (!productById.TryGetValue(productId, out var product))
                return BadRequest(new { message = "One or more products in the order were not found." });

            if (product.QuantityInStock < requestedQty)
            {
                return BadRequest(new
                {
                    message = $"Not enough stock for '{product.ProductCode}'. Please refresh and try again.",
                });
            }

            product.QuantityInStock -= requestedQty;
        }

        _context.Orders.Add(order);
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "Order save failed — likely stock or constraint conflict.");
            return BadRequest(new { message = "Unable to place order. Please refresh and try again." });
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

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequest request, CancellationToken ct = default)
    {
        var normalized = request.Status.Trim();
        if (!AllowedStatuses.TryGetValue(normalized, out var canonicalStatus))
            return BadRequest(new { message = "Unsupported order status." });

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();

        var previousStatus = order.Status;
        order.Status = canonicalStatus;
        order.EstimatedDelivery = request.EstimatedDelivery;
        await _context.SaveChangesAsync(ct);

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
                customerEmail = updatedOrder.Customer.Email,
                total = updatedOrder.Total,
            },
            actorUserId,
            actorEmail,
            ct);

        return Ok(MapOrder(updatedOrder));
    }

    private IQueryable<Order> BuildOrderQuery()
    {
        return _context.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.PaymentMethod)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                    .ThenInclude(p => p.ProductImages)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Country);
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
        var customerName = customer == null
            ? "Customer"
            : $"{customer.FirstName} {customer.LastName}".Trim();
        if (customer != null && string.IsNullOrWhiteSpace(customerName))
            customerName = customer.UserName ?? customer.Email ?? "Customer";

        return new OrderDto
        {
            Id = order.Id,
            CustomerId = order.CustomerId,
            CustomerName = customerName,
            CustomerEmail = customer?.Email ?? string.Empty,
            Total = order.Total,
            Status = order.Status,
            OrderDate = order.OrderDate,
            EstimatedDelivery = order.EstimatedDelivery,
            PaymentMethodId = order.PaymentMethodId,
            PaymentMethodName = order.PaymentMethod?.Name ?? "Card",
            ShippingAddrId = order.ShippingAddrId,
            Items = order.OrderItems
                .OrderBy(i => i.Id)
                .Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ProductCode = i.Product?.ProductCode ?? string.Empty,
                    ProductName = i.Product?.Name ?? "Product",
                    ProductImageUrl = ResolvePrimaryProductImageUrl(i.Product),
                    ProductSubtitle = i.ProductSubtitle,
                    ColorName = i.ColorName,
                    SizeName = i.SizeName,
                    WithLace = i.WithLace,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.UnitPrice * i.Quantity,
                    CountryId = i.CountryId,
                    CountryName = i.Country?.Name,
                })
                .ToList(),
        };
    }

    private void QueueOrderStatusEmail(Order order, OrderEmailEvent emailEvent)
    {
        if (order.Customer == null || string.IsNullOrWhiteSpace(order.Customer.Email))
        {
            _logger.LogWarning(
                "Skipping order status email for order #{OrderId}: customer email is missing.",
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

    private OrderConfirmationEmailMessage BuildOrderStatusMessage(Order order, OrderEmailEvent emailEvent)
    {
        var customer = order.Customer ?? throw new InvalidOperationException("Order customer is not loaded.");
        var customerName = $"{customer.FirstName} {customer.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(customerName))
            customerName = customer.UserName ?? customer.Email ?? "Customer";

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
            ToEmail = customer.Email ?? string.Empty,
            BccEmails = [],
            AccountUrl = accountUrl,
            OrderDateUtc = order.OrderDate,
            Total = order.Total,
            Items = order.OrderItems
                .OrderBy(i => i.Id)
                .Select(i => new OrderConfirmationEmailItem
                {
                    ProductCode = i.Product?.ProductCode ?? string.Empty,
                    ProductName = i.Product?.Name ?? "Product",
                    ProductImageUrl = ResolveAbsoluteImageUrl(ResolvePrimaryProductImageUrl(i.Product), apiBase),
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

    private static string? ResolvePrimaryProductImageUrl(Product? product)
    {
        if (product == null) return null;

        var primary = product.ProductImages?
            .OrderByDescending(pi => pi.IsPrimary)
            .ThenBy(pi => pi.SortOrder)
            .ThenBy(pi => pi.Id)
            .Select(pi => pi.ImageUrl)
            .FirstOrDefault();

        return !string.IsNullOrWhiteSpace(primary) ? primary : product.ImageUrl;
    }

    private string ResolveOrderReceivedNotifyEmail()
    {
        return (_configuration["ORDER_RECEIVED_NOTIFY_EMAIL"]
            ?? Environment.GetEnvironmentVariable("ORDER_RECEIVED_NOTIFY_EMAIL")
            ?? DefaultOrderReceivedNotifyEmail).Trim();
    }

    private static OrderConfirmationEmailMessage CloneMessageForRecipient(OrderConfirmationEmailMessage source, string toEmail)
    {
        return new OrderConfirmationEmailMessage
        {
            OrderId = source.OrderId,
            Event = source.Event,
            CustomerName = source.CustomerName,
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
