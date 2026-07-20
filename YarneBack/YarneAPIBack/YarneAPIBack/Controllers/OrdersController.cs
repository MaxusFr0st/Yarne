using System.Data;
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

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == customerId.Value, ct);
        if (customer == null)
            return BadRequest(new { message = "Customer account was not found." });

        var contactPhone = NormalizePhone(request.PhoneNumber);
        if (string.IsNullOrWhiteSpace(contactPhone))
            return BadRequest(new { message = "Phone number is required." });

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

        // Global color -> lace-product mapping (edited once on the admin Colors tab). Applies
        // identically to every lace-enabled bag (Product.Lace == true); no per-product recipe.
        var laceByColorId = await _context.Colors
            .AsNoTracking()
            .Where(c => c.LaceProductId != null)
            .ToDictionaryAsync(c => c.Id, c => c.LaceProductId!.Value, ct);
        var laceProductIds = laceByColorId.Values.Distinct().ToList();
        var componentProducts = laceProductIds.Count == 0
            ? new Dictionary<int, Product>()
            : (await _context.Products
                .Include(p => p.ProductImages)
                .Include(p => p.ProductColors)
                    .ThenInclude(pc => pc.Images)
                .Include(p => p.ProductColors)
                    .ThenInclude(pc => pc.SizeImages)
                .Where(p => laceProductIds.Contains(p.Id))
                .ToListAsync(ct))
                .ToDictionary(p => p.Id);

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

            var orderItem = new OrderItem
            {
                CountryId = item.CountryId,
                Quantity = item.Quantity,
                UnitPrice = product.Price,
                ListedPriceCents = checked((long)decimal.Round(product.Price * 100m, 0, MidpointRounding.AwayFromZero)),
                NetPriceCents = checked((long)decimal.Round(product.Price * 100m, 0, MidpointRounding.AwayFromZero)),
                UnitCogsCents = 0,
                VatAmountCents = 0,
                CreatedBy = customerId.Value,
                CreatedAt = now,
                UpdatedAt = now,
                ProductSubtitle = NormalizeOptional(item.ProductSubtitle),
                ColorName = NormalizeOptional(item.ColorName),
                FurnitureColorName = NormalizeOptional(item.FurnitureColorName),
                SizeName = NormalizeOptional(item.SizeName),
                WithLace = item.WithLace,
            };
            OrderItemSnapshotHelper.ApplyProductSnapshot(orderItem, product);
            orderItems.Add(orderItem);

            quantityByProductId[product.Id] = quantityByProductId.GetValueOrDefault(product.Id) + item.Quantity;

            // Expand into a child lace OrderItem from the global color->lace-product mapping
            // (each with its own pooled stock decrement + COGS). Never hardcode price — the
            // lace product's own catalog price is the surcharge, added fresh here.
            if (product.Lace && item.WithLace == true)
            {
                // If the client named a color, it must be one of the globally-mapped lace colors
                // (never silently substitute). If it didn't, default to the bag's own color only
                // when that color is itself mapped; otherwise no forced selection and no error —
                // the line simply doesn't compose a lace child.
                int? effectiveColorId;
                if (item.LaceColorId.HasValue)
                {
                    if (!laceByColorId.ContainsKey(item.LaceColorId.Value))
                        return BadRequest(new { message = $"Product '{productKey}' does not offer the selected lace color." });
                    effectiveColorId = item.LaceColorId.Value;
                }
                else
                {
                    effectiveColorId = product.DefaultColorId.HasValue && laceByColorId.ContainsKey(product.DefaultColorId.Value)
                        ? product.DefaultColorId.Value
                        : null;
                }

                if (effectiveColorId.HasValue
                    && componentProducts.TryGetValue(laceByColorId[effectiveColorId.Value], out var componentProduct)
                    && componentProduct.IsActive && !componentProduct.IsVoid)
                {
                    var componentQuantity = item.Quantity;
                    var componentPriceCents = checked((long)decimal.Round(
                        componentProduct.Price * 100m, 0, MidpointRounding.AwayFromZero));
                    var componentLine = new OrderItem
                    {
                        CountryId = item.CountryId,
                        Quantity = componentQuantity,
                        UnitPrice = componentProduct.Price,
                        ListedPriceCents = componentPriceCents,
                        NetPriceCents = componentPriceCents,
                        UnitCogsCents = 0,
                        VatAmountCents = 0,
                        CreatedBy = customerId.Value,
                        CreatedAt = now,
                        UpdatedAt = now,
                        // Component line links back to its bag line so order/return views group them.
                        ParentOrderItem = orderItem,
                    };
                    OrderItemSnapshotHelper.ApplyProductSnapshot(componentLine, componentProduct);
                    orderItems.Add(componentLine);

                    quantityByProductId[componentProduct.Id] =
                        quantityByProductId.GetValueOrDefault(componentProduct.Id) + componentQuantity;
                }
            }
        }

        var orderTotalCents = orderItems.Sum(i => checked(i.ListedPriceCents * i.Quantity));
        var ownStoreChannelId = await _context.SalesChannels
            .Where(x => !x.IsVoid && x.FeeType == "none")
            .OrderBy(x => x.Id)
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync(ct);

        var order = new Order
        {
            CustomerId = customerId.Value,
            PaymentMethodId = paymentMethodId,
            ShippingAddrId = request.ShippingAddrId,
            ChannelId = ownStoreChannelId,
            ChannelFeeCents = 0,
            IsChannelFeeOverridden = false,
            CurrencyCode = "UAH",
            ExchangeRateToBase = 1m,
            Status = "Pending",
            TotalCents = orderTotalCents,
            OrderDate = now,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedBy = customerId.Value,
            OrderItems = orderItems,
        };

        ActionResult<OrderDto>? stockFailure = null;
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct);
            foreach (var productId in quantityByProductId.Keys.OrderBy(id => id))
            {
                var requestedQty = quantityByProductId[productId];
                var product = await _context.Products
                    .FromSqlInterpolated(
                        $"""SELECT * FROM "Product" WHERE "Id" = {productId} FOR UPDATE""")
                    .SingleOrDefaultAsync(ct);
                if (product is null || product.IsVoid || !product.IsActive)
                {
                    stockFailure = BadRequest(new { message = "One or more products in the order were not found." });
                    await transaction.RollbackAsync(ct);
                    return;
                }

                var finishedInventory = await _context.FinishedGoodsInventories
                    .FromSqlInterpolated(
                        $"""
                         SELECT * FROM "FinishedGoodsInventory"
                         WHERE "ProductId" = {productId}
                         FOR UPDATE
                         """)
                    .SingleOrDefaultAsync(ct);
                if (finishedInventory is null || finishedInventory.IsVoid)
                {
                    stockFailure = BadRequest(new
                    {
                        message = $"'{product.ProductCode}' has no finished-goods stock ledger. Produce the item before selling.",
                    });
                    await transaction.RollbackAsync(ct);
                    return;
                }

                if (product.QuantityInStock < requestedQty || finishedInventory.QuantityOnHand < requestedQty)
                {
                    stockFailure = BadRequest(new
                    {
                        message = $"Not enough stock for '{product.ProductCode}'. Please refresh and try again.",
                    });
                    await transaction.RollbackAsync(ct);
                    return;
                }

                product.QuantityInStock -= requestedQty;
                product.UpdatedAt = now;
                finishedInventory.QuantityOnHand -= requestedQty;
                finishedInventory.UpdatedAt = now;

                foreach (var orderItem in orderItems.Where(item => item.ProductId == productId))
                    orderItem.UnitCogsCents = finishedInventory.AverageUnitCostCents;
            }

            customer.PhoneNumber = contactPhone;
            _context.Entry(customer).Property(c => c.PhoneNumber).IsModified = true;
            _context.Orders.Add(order);
            try
            {
                await _context.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogWarning(ex, "Order save failed — likely stock or constraint conflict.");
                await transaction.RollbackAsync(ct);
                stockFailure = BadRequest(new { message = "Unable to place order. Please refresh and try again." });
            }
        });

        if (stockFailure != null)
            return stockFailure;

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

        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null)
            return NotFound();

        var previousStatus = order.Status;
        var wasCanceled = string.Equals(previousStatus, "Canceled", StringComparison.OrdinalIgnoreCase);
        var willBeCanceled = string.Equals(canonicalStatus, "Canceled", StringComparison.OrdinalIgnoreCase);
        if (wasCanceled != willBeCanceled)
        {
            var quantities = order.OrderItems
                .Where(item => !item.IsVoid && item.ProductId.HasValue)
                .GroupBy(item => item.ProductId!.Value)
                .ToDictionary(group => group.Key, group => group.Sum(item => item.Quantity));

            ActionResult<OrderDto>? stockFailure = null;
            string? lockedPreviousStatus = null;
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    ct);
                var lockedOrder = await _context.Orders
                    .FromSqlInterpolated($"""SELECT * FROM "Order" WHERE "Id" = {id} FOR UPDATE""")
                    .SingleOrDefaultAsync(ct);
                if (lockedOrder is null)
                {
                    stockFailure = NotFound();
                    await transaction.RollbackAsync(ct);
                    return;
                }

                lockedPreviousStatus = lockedOrder.Status;
                var lockedWasCanceled = string.Equals(
                    lockedPreviousStatus,
                    "Canceled",
                    StringComparison.OrdinalIgnoreCase);
                if (lockedWasCanceled == willBeCanceled)
                {
                    // Another request already applied this cancel/reopen transition.
                    lockedOrder.Status = canonicalStatus;
                    lockedOrder.EstimatedDelivery = request.EstimatedDelivery;
                    lockedOrder.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync(ct);
                    await transaction.CommitAsync(ct);
                    return;
                }

                var now = DateTime.UtcNow;
                foreach (var productId in quantities.Keys.OrderBy(pid => pid))
                {
                    var quantity = quantities[productId];
                    var product = await _context.Products
                        .FromSqlInterpolated(
                            $"""SELECT * FROM "Product" WHERE "Id" = {productId} FOR UPDATE""")
                        .SingleOrDefaultAsync(ct);
                    var inventory = await _context.FinishedGoodsInventories
                        .FromSqlInterpolated(
                            $"""
                             SELECT * FROM "FinishedGoodsInventory"
                             WHERE "ProductId" = {productId}
                             FOR UPDATE
                             """)
                        .SingleOrDefaultAsync(ct);
                    if (product is null || product.IsVoid || inventory is null || inventory.IsVoid)
                    {
                        stockFailure = BadRequest(new { message = "Order stock records are incomplete." });
                        await transaction.RollbackAsync(ct);
                        return;
                    }

                    if (willBeCanceled)
                    {
                        product.QuantityInStock = checked(product.QuantityInStock + quantity);
                        inventory.QuantityOnHand = checked(inventory.QuantityOnHand + quantity);
                    }
                    else
                    {
                        if (product.QuantityInStock < quantity || inventory.QuantityOnHand < quantity)
                        {
                            stockFailure = BadRequest(new { message = "Not enough stock to reopen this canceled order." });
                            await transaction.RollbackAsync(ct);
                            return;
                        }
                        product.QuantityInStock -= quantity;
                        inventory.QuantityOnHand -= quantity;
                    }
                    product.UpdatedAt = now;
                    inventory.UpdatedAt = now;
                }

                lockedOrder.Status = canonicalStatus;
                lockedOrder.EstimatedDelivery = request.EstimatedDelivery;
                lockedOrder.UpdatedAt = now;
                await _context.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            });

            if (stockFailure != null)
                return stockFailure;

            previousStatus = lockedPreviousStatus ?? previousStatus;
        }
        else
        {
            // Even for non-stock-touching transitions, take a row-level lock so concurrent
            // status writes on the same order serialize rather than silently last-write-win.
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
                total = updatedOrder.TotalCents / 100m,
            },
            actorUserId,
            actorEmail,
            ct);

        return Ok(MapOrder(updatedOrder));
    }

    private IQueryable<Order> BuildAdminOrderListQuery()
    {
        return _context.Orders
            .AsNoTracking()
            .AsSplitQuery()
            .Include(o => o.Customer)
            .Include(o => o.PaymentMethod)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Country)
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
                .ThenInclude(oi => oi.Country)
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
            CustomerPhoneNumber = customer?.PhoneNumber,
            Total = order.TotalCents / 100m,
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
            CustomerEmail = customer.Email ?? string.Empty,
            ToEmail = customer.Email ?? string.Empty,
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
