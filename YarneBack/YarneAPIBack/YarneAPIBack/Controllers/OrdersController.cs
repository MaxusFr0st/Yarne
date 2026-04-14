using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Models;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private static readonly Dictionary<string, string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        ["pending"] = "Pending",
        ["processing"] = "Processing",
        ["shipped"] = "Shipped",
        ["delivered"] = "Delivered",
        ["cancelled"] = "Cancelled",
    };

    private readonly YarneDbContext _context;

    public OrdersController(YarneDbContext context)
    {
        _context = context;
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
        if (request.Items.Count == 0)
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

            orderItems.Add(new OrderItem
            {
                ProductId = product.Id,
                CountryId = item.CountryId,
                Quantity = item.Quantity,
                UnitPrice = product.Price,
            });
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

        _context.Orders.Add(order);
        await _context.SaveChangesAsync(ct);

        var createdOrder = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == order.Id, ct);
        if (createdOrder == null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Order was created but could not be loaded." });

        return CreatedAtAction(nameof(GetOrderById), new { id = order.Id }, MapOrder(createdOrder));
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

        order.Status = canonicalStatus;
        order.EstimatedDelivery = request.EstimatedDelivery;
        await _context.SaveChangesAsync(ct);

        var updatedOrder = await BuildOrderQuery().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (updatedOrder == null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Order was updated but could not be loaded." });

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
        var customerName = $"{order.Customer.FirstName} {order.Customer.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(customerName))
            customerName = order.Customer.UserName;

        return new OrderDto
        {
            Id = order.Id,
            CustomerId = order.CustomerId,
            CustomerName = customerName,
            CustomerEmail = order.Customer.Email,
            Total = order.Total,
            Status = order.Status,
            OrderDate = order.OrderDate,
            EstimatedDelivery = order.EstimatedDelivery,
            PaymentMethodId = order.PaymentMethodId,
            PaymentMethodName = order.PaymentMethod.Name,
            ShippingAddrId = order.ShippingAddrId,
            Items = order.OrderItems
                .OrderBy(i => i.Id)
                .Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ProductCode = i.Product.ProductCode,
                    ProductName = i.Product.Name,
                    ProductImageUrl = i.Product.ImageUrl,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.UnitPrice * i.Quantity,
                    CountryId = i.CountryId,
                    CountryName = i.Country?.Name,
                })
                .ToList(),
        };
    }
}
