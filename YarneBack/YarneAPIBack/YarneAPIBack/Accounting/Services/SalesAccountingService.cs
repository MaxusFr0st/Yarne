using System.Data;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Models;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Data;
using YarneAPIBack.Models;

namespace YarneAPIBack.Accounting.Services;

public sealed class SalesAccountingService : ISalesAccountingService
{
    private static readonly HashSet<string> FeeTypes =
        new(StringComparer.Ordinal) { "none", "percentage", "flat", "percentage_plus_flat" };

    private readonly YarneDbContext _db;

    public SalesAccountingService(YarneDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AccountingCustomerDto>> GetCustomersAsync(
        CancellationToken ct = default)
    {
        return await CustomerQuery()
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(CustomerProjection)
            .ToListAsync(ct);
    }

    public async Task<AccountingCustomerDto> CreateCustomerAsync(
        SaveAccountingCustomerRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidateCustomer(request);
        var email = request.Email.Trim();
        if (await _db.Customers.AnyAsync(x => x.Email == email, ct))
            throw new AccountingBusinessException($"A customer with email '{email}' already exists.");

        // Admin-created contacts (in-person / social-media sales) need a Customer row to
        // attach sales to, but they don't log in — issue an unusable random password/username.
        var salt = BCrypt.Net.BCrypt.GenerateSalt(12);
        var hash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"), salt);
        var customer = new Customer
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            UserName = $"walkin_{Guid.NewGuid():N}",
            Email = email,
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            PasswordHash = hash,
            PasswordSalt = salt,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        var role = await _db.Roles.SingleOrDefaultAsync(x => x.Name == "Customer", ct);
        if (role is not null)
            _db.CustomerRoles.Add(new CustomerRole { CustomerId = customer.Id, RoleId = role.Id });

        await UpsertAddressAsync(customer.Id, request, ct);
        await _db.SaveChangesAsync(ct);

        return (await GetCustomerDtoAsync(customer.Id, ct))!;
    }

    public async Task<AccountingCustomerDto?> UpdateCustomerAsync(
        int id,
        SaveAccountingCustomerRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidateCustomer(request);
        var customer = await _db.Customers.SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (customer is null)
            return null;
        var email = request.Email.Trim();
        if (await _db.Customers.AnyAsync(x => x.Id != id && x.Email == email, ct))
            throw new AccountingBusinessException($"A customer with email '{email}' already exists.");

        customer.FirstName = request.FirstName.Trim();
        customer.LastName = request.LastName.Trim();
        customer.Email = email;
        customer.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        await UpsertAddressAsync(id, request, ct);
        await _db.SaveChangesAsync(ct);

        return await GetCustomerDtoAsync(id, ct);
    }

    public async Task<bool> VoidCustomerAsync(int id, int? actorId, CancellationToken ct = default)
    {
        var customer = await _db.Customers.SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (customer is null)
            return false;
        customer.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> VoidSalesOrderAsync(int id, int? actorId, CancellationToken ct = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        var found = true;
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct);
            var order = await _db.Orders
                .FromSqlInterpolated($"""SELECT * FROM "Order" WHERE "Id" = {id} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (order is null || order.IsVoid || order.ChannelId is null)
            {
                found = false;
                await transaction.RollbackAsync(ct);
                return;
            }
            if (string.Equals(order.Status, "Canceled", StringComparison.OrdinalIgnoreCase))
                throw new AccountingBusinessException("This sale is already canceled.");

            // A sale with a return recorded against it cannot be unwound blindly — the return
            // already adjusted revenue/COGS/fees against it; void the return first if needed.
            if (await _db.ReturnOrders.AnyAsync(x => x.SalesOrderId == id && !x.IsVoid, ct))
                throw new AccountingBusinessException(
                    "This sale has a return recorded against it and cannot be voided directly.");

            await _db.Entry(order)
                .Collection(x => x.OrderItems)
                .Query()
                .Where(item => !item.IsVoid)
                .Include(item => item.FinishedGoodsConsumptions.Where(c => !c.IsVoid))
                .LoadAsync(ct);

            var now = DateTime.UtcNow;
            foreach (var group in order.OrderItems
                .Where(x => x.ProductId.HasValue)
                .GroupBy(x => x.ProductId!.Value)
                .OrderBy(x => x.Key))
            {
                var productId = group.Key;
                var quantity = group.Sum(x => x.Quantity);
                var product = await _db.Products
                    .FromSqlInterpolated($"""SELECT * FROM "Product" WHERE "Id" = {productId} FOR UPDATE""")
                    .SingleOrDefaultAsync(ct);
                if (product is null)
                    continue;
                var inventory = await _db.FinishedGoodsInventories
                    .FromSqlInterpolated(
                        $"""
                         SELECT * FROM "FinishedGoodsInventory"
                         WHERE "ProductId" = {productId}
                         FOR UPDATE
                         """)
                    .SingleOrDefaultAsync(ct);
                if (inventory is not null)
                {
                    inventory.QuantityOnHand = checked(inventory.QuantityOnHand + quantity);
                    inventory.UpdatedAt = now;
                }
                product.QuantityInStock = checked(product.QuantityInStock + quantity);
                product.UpdatedAt = now;

                foreach (var consumption in group.SelectMany(item => item.FinishedGoodsConsumptions)
                    .OrderBy(c => c.Id))
                {
                    var lot = await _db.FinishedGoodsLots
                        .FromSqlInterpolated(
                            $"""SELECT * FROM "FinishedGoodsLot" WHERE "Id" = {consumption.FinishedGoodsLotId} FOR UPDATE""")
                        .SingleOrDefaultAsync(ct);
                    if (lot is not null)
                    {
                        lot.QuantityRemaining = checked(lot.QuantityRemaining + consumption.Quantity);
                        lot.UpdatedAt = now;
                    }
                    consumption.IsVoid = true;
                    consumption.UpdatedAt = now;
                }
            }

            order.IsVoid = true;
            order.Status = "Canceled";
            order.UpdatedAt = now;
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        });
        return found;
    }

    private async Task<AccountingCustomerDto?> GetCustomerDtoAsync(int id, CancellationToken ct) =>
        await CustomerQuery()
            .Where(x => x.Id == id)
            .Select(CustomerProjection)
            .SingleOrDefaultAsync(ct);

    private async Task UpsertAddressAsync(int customerId, SaveAccountingCustomerRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.AddressLine1) ||
            string.IsNullOrWhiteSpace(request.City) ||
            !request.CountryId.HasValue)
        {
            return;
        }
        if (!await _db.Countries.AnyAsync(x => x.Id == request.CountryId.Value, ct))
            throw new AccountingBusinessException("Selected country was not found.");

        var address = await _db.CustomerAddresses
            .Where(x => x.CustomerId == customerId && x.IsDefault)
            .SingleOrDefaultAsync(ct);
        if (address is null)
        {
            address = new CustomerAddress { CustomerId = customerId, IsDefault = true };
            _db.CustomerAddresses.Add(address);
        }
        address.AddressLine1 = request.AddressLine1.Trim();
        address.AddressLine2 = string.IsNullOrWhiteSpace(request.AddressLine2) ? null : request.AddressLine2.Trim();
        address.City = request.City.Trim();
        address.PostalCode = string.IsNullOrWhiteSpace(request.PostalCode) ? null : request.PostalCode.Trim();
        address.CountryId = request.CountryId.Value;
    }

    private IQueryable<Customer> CustomerQuery() =>
        _db.Customers.AsNoTracking().Where(x => x.IsActive);

    private static readonly System.Linq.Expressions.Expression<Func<Customer, AccountingCustomerDto>>
        CustomerProjection = x => new AccountingCustomerDto(
            x.Id,
            x.FirstName,
            x.LastName,
            (x.FirstName + " " + x.LastName).Trim(),
            x.Email,
            x.PhoneNumber,
            x.CustomerAddresses
                .OrderByDescending(a => a.IsDefault)
                .Select(a => a.AddressLine1 + ", " + a.City)
                .FirstOrDefault());

    private static void ValidateCustomer(SaveAccountingCustomerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) || request.FirstName.Trim().Length > 100)
            throw new AccountingBusinessException("First name is required and cannot exceed 100 characters.");
        if (string.IsNullOrWhiteSpace(request.LastName) || request.LastName.Trim().Length > 100)
            throw new AccountingBusinessException("Last name is required and cannot exceed 100 characters.");
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@') || request.Email.Trim().Length > 200)
            throw new AccountingBusinessException("A valid email is required.");
    }

    public async Task<IReadOnlyList<SalesChannelDto>> GetChannelsAsync(CancellationToken ct = default)
    {
        var rows = await _db.SalesChannels
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .OrderBy(x => x.Name)
            .ToListAsync(ct);
        return rows.Select(MapChannel).ToList();
    }

    public async Task<SalesChannelDto> CreateChannelAsync(
        SaveSalesChannelRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidateChannel(request);
        var name = request.Name.Trim();
        var currency = NormalizeCurrency(request.CurrencyCode);
        await EnsureCurrencyAsync(currency, ct);
        if (await _db.SalesChannels.AnyAsync(x => !x.IsVoid && x.Name == name, ct))
            throw new AccountingBusinessException($"Sales channel '{name}' already exists.");

        var now = DateTime.UtcNow;
        var entity = new SalesChannel
        {
            Name = name,
            FeeType = request.FeeType,
            FeePercentage = request.FeePercentage,
            FeeFlatCents = request.FeeFlatCents,
            CurrencyCode = currency,
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.SalesChannels.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapChannel(entity);
    }

    public async Task<SalesChannelDto?> UpdateChannelAsync(
        int id,
        SaveSalesChannelRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidateChannel(request);
        var entity = await _db.SalesChannels.SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return null;
        var name = request.Name.Trim();
        if (await _db.SalesChannels.AnyAsync(x => !x.IsVoid && x.Id != id && x.Name == name, ct))
            throw new AccountingBusinessException($"Sales channel '{name}' already exists.");
        var currency = NormalizeCurrency(request.CurrencyCode);
        await EnsureCurrencyAsync(currency, ct);

        entity.Name = name;
        entity.FeeType = request.FeeType;
        entity.FeePercentage = request.FeePercentage;
        entity.FeeFlatCents = request.FeeFlatCents;
        entity.CurrencyCode = currency;
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return MapChannel(entity);
    }

    public async Task<bool> VoidChannelAsync(int id, int? actorId, CancellationToken ct = default)
    {
        var entity = await _db.SalesChannels.SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return false;
        if (await _db.Orders.AnyAsync(x => x.ChannelId == id && !x.IsVoid, ct))
            throw new AccountingBusinessException("This channel is used by sales orders and cannot be voided.");
        entity.IsVoid = true;
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<AccountingSalesOrderDto>> GetSalesOrdersAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default)
    {
        var query = SalesOrderQuery();
        if (from.HasValue)
            query = query.Where(x => x.OrderDate >= EnsureUtc(from.Value));
        if (to.HasValue)
            query = query.Where(x => x.OrderDate <= EnsureUtc(to.Value));
        var rows = await query.OrderByDescending(x => x.OrderDate).ThenByDescending(x => x.Id).ToListAsync(ct);
        return rows.Select(MapSalesOrder).ToList();
    }

    public async Task<AccountingSalesOrderDto?> GetSalesOrderAsync(int id, CancellationToken ct = default)
    {
        var row = await SalesOrderQuery().SingleOrDefaultAsync(x => x.Id == id, ct);
        return row is null ? null : MapSalesOrder(row);
    }

    public async Task<AccountingSalesOrderDto> CreateSalesOrderAsync(
        CreateAccountingSalesOrderRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidateSale(request);
        var strategy = _db.Database.CreateExecutionStrategy();
        var orderId = 0;
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct);
            var customerExists = await _db.Customers.AnyAsync(
                x => x.Id == request.CustomerId && x.IsActive,
                ct);
            if (!customerExists)
                throw new AccountingBusinessException("Customer was not found.");
            var channel = await _db.SalesChannels
                .SingleOrDefaultAsync(x => x.Id == request.ChannelId && !x.IsVoid, ct)
                ?? throw new AccountingBusinessException("Sales channel was not found.");

            var orderDate = EnsureUtc(request.OrderDate);
            var currency = NormalizeCurrency(request.CurrencyCode);
            var orderRate = await ResolveRateToBaseAsync(
                currency,
                request.ExchangeRateToBase,
                orderDate,
                ct);
            var paymentMethodId = await GetOrCreatePaymentMethodAsync(ct);
            var now = DateTime.UtcNow;
            var requestedByProduct = request.Items
                .GroupBy(x => x.ProductId)
                .ToDictionary(group => group.Key, group => group.Single());
            var prepared = new List<PreparedLine>();

            // Prepares one order line for a product+quantity: locks the product and its finished
            // inventory, validates stock, runs FIFO lot consumption, decrements pooled counters,
            // and appends a PreparedLine. Returns its index (so a component can point back at its
            // base line's index for the parent/child link). Reused for both base and component
            // lines — EF's identity map keeps repeated FOR UPDATE reads / decrements consistent
            // within this transaction when two base lines share one component product.
            async Task<int> PrepareLineAsync(
                int lineProductId,
                int quantity,
                long? listedOverride,
                long vatAmountCents,
                int? parentIndex)
            {
                var product = await _db.Products
                    .FromSqlInterpolated(
                        $"""SELECT * FROM "Product" WHERE "Id" = {lineProductId} FOR UPDATE""")
                    .SingleOrDefaultAsync(ct);
                if (product is null || product.IsVoid || !product.IsActive)
                    throw new AccountingBusinessException($"Product #{lineProductId} is unavailable.");
                var inventory = await _db.FinishedGoodsInventories
                    .FromSqlInterpolated(
                        $"""
                         SELECT * FROM "FinishedGoodsInventory"
                         WHERE "ProductId" = {lineProductId}
                         FOR UPDATE
                         """)
                    .SingleOrDefaultAsync(ct);
                if (inventory is null || inventory.IsVoid || inventory.QuantityOnHand < quantity)
                    throw new AccountingBusinessException($"Not enough finished stock for '{product.Name}'.");

                var listedPrice = listedOverride ?? await ConvertMoneyAsync(
                    product.SellingPriceCents,
                    product.SellingCurrencyCode,
                    currency,
                    orderDate,
                    ct);
                if (listedPrice < 0)
                    throw new AccountingBusinessException("Listed price cannot be negative.");
                if (vatAmountCents > checked(listedPrice * quantity))
                    throw new AccountingBusinessException($"VAT exceeds the listed total for '{product.Name}'.");

                var lotConsumptions = await ConsumeFinishedGoodsFifoAsync(lineProductId, quantity, ct);
                var totalCogs = lotConsumptions.Sum(x => x.TotalCostCents);
                var unitCogs = RoundToCents((decimal)totalCogs / quantity);

                inventory.QuantityOnHand -= quantity;
                inventory.UpdatedAt = now;
                if (product.QuantityInStock < quantity)
                    throw new AccountingBusinessException($"Not enough storefront stock for '{product.Name}'.");
                product.QuantityInStock -= quantity;
                product.UpdatedAt = now;
                prepared.Add(new PreparedLine(
                    product,
                    quantity,
                    listedPrice,
                    unitCogs,
                    vatAmountCents,
                    lotConsumptions,
                    parentIndex));
                return prepared.Count - 1;
            }

            foreach (var productId in requestedByProduct.Keys.OrderBy(x => x))
            {
                var item = requestedByProduct[productId];
                var baseIndex = await PrepareLineAsync(
                    productId,
                    item.Quantity,
                    item.ListedPriceCents,
                    item.VatAmountCents,
                    null);

                // Expand into a component lace line (its own FIFO consumption + COGS), linked to
                // this base line, sourced from the global color->lace-product mapping. Offline
                // sale lines carry no "bag color" to fall back on, so an explicit LaceColorId is
                // required when WithLace is set; otherwise composition is skipped (no error).
                if (item.WithLace)
                {
                    if (!item.LaceColorId.HasValue)
                        throw new AccountingBusinessException(
                            $"Product #{productId} requires a lace color selection.");

                    var laceProductId = await _db.Colors
                        .Where(c => c.Id == item.LaceColorId.Value && c.LaceProductId != null)
                        .Select(c => (int?)c.LaceProductId)
                        .FirstOrDefaultAsync(ct);
                    if (!laceProductId.HasValue)
                        throw new AccountingBusinessException(
                            $"Product #{productId} does not offer the selected lace color.");

                    await PrepareLineAsync(
                        laceProductId.Value,
                        item.Quantity,
                        null,
                        0,
                        baseIndex);
                }
            }

            var listedRevenue = prepared.Sum(x => checked(x.ListedPriceCents * x.Quantity));
            var channelFee = request.ChannelFeeCents ?? await CalculateChannelFeeAsync(
                channel,
                listedRevenue,
                currency,
                orderDate,
                ct);
            if (channelFee < 0 || channelFee > listedRevenue)
                throw new AccountingBusinessException("Channel fee must be between zero and listed revenue.");

            var orderItems = AllocateFee(prepared, channelFee, actorId, now);
            var order = new Order
            {
                CustomerId = request.CustomerId,
                PaymentMethodId = paymentMethodId,
                ChannelId = channel.Id,
                ChannelFeeCents = channelFee,
                IsChannelFeeOverridden = request.ChannelFeeCents.HasValue,
                CurrencyCode = currency,
                ExchangeRateToBase = orderRate,
                TotalCents = listedRevenue,
                Status = "Accepted",
                OrderDate = orderDate,
                CreatedAt = now,
                CreatedBy = actorId,
                UpdatedAt = now,
                OrderItems = orderItems,
            };
            _db.Orders.Add(order);
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            orderId = order.Id;
        });

        return (await GetSalesOrderAsync(orderId, ct))!;
    }

    private IQueryable<Order> SalesOrderQuery()
    {
        return _db.Orders
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.ChannelId != null)
            .Include(x => x.Customer)
            .Include(x => x.Channel)
            .Include(x => x.OrderItems.Where(item => !item.IsVoid))
                .ThenInclude(x => x.Product);
    }

    private async Task<long> CalculateChannelFeeAsync(
        SalesChannel channel,
        long listedRevenueCents,
        string orderCurrency,
        DateTime orderDate,
        CancellationToken ct)
    {
        var percentageFee = channel.FeeType is "percentage" or "percentage_plus_flat"
            ? RoundToCents(listedRevenueCents * channel.FeePercentage / 100m)
            : 0;
        var flatFee = channel.FeeType is "flat" or "percentage_plus_flat"
            ? await ConvertMoneyAsync(
                channel.FeeFlatCents,
                channel.CurrencyCode,
                orderCurrency,
                orderDate,
                ct)
            : 0;
        return checked(percentageFee + flatFee);
    }

    private async Task<List<LotConsumption>> ConsumeFinishedGoodsFifoAsync(
        int productId,
        int quantity,
        CancellationToken ct)
    {
        var lots = await _db.FinishedGoodsLots
            .FromSqlInterpolated(
                $"""
                 SELECT * FROM "FinishedGoodsLot"
                 WHERE "ProductId" = {productId}
                   AND "QuantityRemaining" > 0
                   AND "IsVoid" = false
                 ORDER BY "CreatedAt", "Id"
                 FOR UPDATE
                 """)
            .ToListAsync(ct);

        var available = lots.Sum(x => x.QuantityRemaining);
        if (available < quantity)
            throw new AccountingBusinessException("Not enough finished stock for this product.");

        var result = new List<LotConsumption>();
        var quantityLeft = quantity;
        foreach (var lot in lots)
        {
            if (quantityLeft <= 0)
                break;
            var quantityUsed = Math.Min(lot.QuantityRemaining, quantityLeft);
            lot.QuantityRemaining -= quantityUsed;
            lot.UpdatedAt = DateTime.UtcNow;
            result.Add(new LotConsumption(lot.Id, quantityUsed, lot.UnitCostCents, checked(lot.UnitCostCents * quantityUsed)));
            quantityLeft -= quantityUsed;
        }
        return result;
    }

    private static List<OrderItem> AllocateFee(
        IReadOnlyList<PreparedLine> lines,
        long totalFeeCents,
        int? actorId,
        DateTime now)
    {
        var grossTotal = lines.Sum(x => checked(x.ListedPriceCents * x.Quantity));
        var remainingFee = totalFeeCents;
        var remainingGross = grossTotal;
        var result = new List<OrderItem>(lines.Count);
        for (var index = 0; index < lines.Count; index++)
        {
            var line = lines[index];
            var lineGross = checked(line.ListedPriceCents * line.Quantity);
            // Free / zero-gross multi-line orders must never divide by remainingGross == 0.
            // Last line still absorbs any residual fee (normally 0 when gross is 0).
            long share;
            if (index == lines.Count - 1)
                share = remainingFee;
            else if (remainingGross <= 0 || lineGross <= 0)
                share = 0;
            else
                share = RoundToCents((decimal)remainingFee * lineGross / remainingGross);
            share = Math.Clamp(share, 0, Math.Max(lineGross, 0));
            var lineNet = lineGross - share;
            var netUnit = line.Quantity == 0
                ? 0
                : RoundToCents((decimal)lineNet / line.Quantity);
            result.Add(new OrderItem
            {
                ProductId = line.Product.Id,
                ProductName = line.Product.Name,
                ProductCode = line.Product.ProductCode,
                ProductImageUrl = line.Product.ImageUrl,
                Quantity = line.Quantity,
                UnitPrice = line.ListedPriceCents / 100m,
                ListedPriceCents = line.ListedPriceCents,
                ChannelFeeShareCents = share,
                NetPriceCents = netUnit,
                UnitCogsCents = line.UnitCogsCents,
                VatAmountCents = line.VatAmountCents,
                CreatedBy = actorId,
                CreatedAt = now,
                UpdatedAt = now,
                FinishedGoodsConsumptions = line.LotConsumptions.Select(lc => new SalesFinishedGoodsConsumption
                {
                    FinishedGoodsLotId = lc.LotId,
                    Quantity = lc.Quantity,
                    UnitCostAtSaleCents = lc.UnitCostCents,
                    TotalCostCents = lc.TotalCostCents,
                    CreatedBy = actorId,
                    CreatedAt = now,
                    UpdatedAt = now,
                }).ToList(),
            });
            remainingFee -= share;
            remainingGross -= lineGross;
        }

        // Wire component lines to their base line via navigation (EF sets ParentOrderItemId on
        // save once the parent's Id is generated). result[i] corresponds to lines[i].
        for (var index = 0; index < lines.Count; index++)
        {
            if (lines[index].ParentIndex is int parentIndex)
                result[index].ParentOrderItem = result[parentIndex];
        }
        return result;
    }

    private async Task<long> ConvertMoneyAsync(
        long amountCents,
        string fromCurrency,
        string toCurrency,
        DateTime effectiveAt,
        CancellationToken ct)
    {
        if (fromCurrency == toCurrency)
            return amountCents;
        var fromRate = await ResolveRateToBaseAsync(fromCurrency, null, effectiveAt, ct);
        var toRate = await ResolveRateToBaseAsync(toCurrency, null, effectiveAt, ct);
        return RoundToCents(amountCents * fromRate / toRate);
    }

    private async Task<decimal> ResolveRateToBaseAsync(
        string currency,
        decimal? suppliedRate,
        DateTime effectiveAt,
        CancellationToken ct)
    {
        var baseCode = await _db.AccountingCurrencies
            .Where(x => x.IsBase && x.IsActive && !x.IsVoid)
            .Select(x => x.Code)
            .SingleAsync(ct);
        await EnsureCurrencyAsync(currency, ct);
        if (currency == baseCode)
            return 1m;
        if (suppliedRate.HasValue)
        {
            if (suppliedRate.Value <= 0)
                throw new AccountingBusinessException("Exchange rate must be greater than zero.");
            return decimal.Round(suppliedRate.Value, 8, MidpointRounding.AwayFromZero);
        }
        return await _db.CurrencyExchangeRates
            .Where(x =>
                !x.IsVoid &&
                x.FromCurrencyCode == currency &&
                x.ToCurrencyCode == baseCode &&
                x.EffectiveAt <= effectiveAt)
            .OrderByDescending(x => x.EffectiveAt)
            .Select(x => (decimal?)x.Rate)
            .FirstOrDefaultAsync(ct)
            ?? throw new AccountingBusinessException(
                $"Set a {currency}/{baseCode} exchange rate for the sale date.");
    }

    private async Task<int> GetOrCreatePaymentMethodAsync(CancellationToken ct)
    {
        var id = await _db.PaymentMethods.OrderBy(x => x.Id).Select(x => x.Id).FirstOrDefaultAsync(ct);
        if (id != 0)
            return id;
        var paymentMethod = new PaymentMethod { Name = "Manual" };
        _db.PaymentMethods.Add(paymentMethod);
        await _db.SaveChangesAsync(ct);
        return paymentMethod.Id;
    }

    private async Task EnsureCurrencyAsync(string code, CancellationToken ct)
    {
        if (!await _db.AccountingCurrencies.AnyAsync(
                x => x.Code == code && x.IsActive && !x.IsVoid,
                ct))
        {
            throw new AccountingBusinessException($"Currency '{code}' is unavailable.");
        }
    }

    private static AccountingSalesOrderDto MapSalesOrder(Order entity)
    {
        var items = entity.OrderItems
            .Where(x => !x.IsVoid)
            .OrderBy(x => x.Id)
            .Select(x =>
            {
                var listedTotal = checked(x.ListedPriceCents * x.Quantity);
                return new AccountingSalesOrderItemDto(
                    x.Id,
                    x.ProductId ?? 0,
                    x.ParentOrderItemId,
                    x.ProductName,
                    x.ProductCode,
                    x.Quantity,
                    x.ListedPriceCents,
                    listedTotal,
                    x.ChannelFeeShareCents,
                    listedTotal - x.ChannelFeeShareCents,
                    x.UnitCogsCents,
                    checked(x.UnitCogsCents * x.Quantity),
                    x.VatAmountCents);
            })
            .ToList();
        var listedRevenue = items.Sum(x => x.ListedTotalCents);
        return new AccountingSalesOrderDto(
            entity.Id,
            entity.CustomerId,
            $"{entity.Customer.FirstName} {entity.Customer.LastName}".Trim(),
            entity.ChannelId,
            entity.Channel?.Name ?? "Own store",
            entity.CreatedAt,
            entity.Status,
            entity.CurrencyCode,
            entity.ExchangeRateToBase,
            listedRevenue,
            entity.ChannelFeeCents,
            listedRevenue - entity.ChannelFeeCents,
            items.Sum(x => x.TotalCogsCents),
            items.Sum(x => x.VatAmountCents),
            entity.IsChannelFeeOverridden,
            entity.OrderDate,
            entity.UpdatedAt,
            items);
    }

    private static SalesChannelDto MapChannel(SalesChannel entity) =>
        new(
            entity.Id,
            entity.Name,
            entity.FeeType,
            entity.FeePercentage,
            entity.FeeFlatCents,
            entity.CurrencyCode,
            entity.CreatedAt,
            entity.UpdatedAt);

    private static void ValidateChannel(SaveSalesChannelRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 150)
            throw new AccountingBusinessException("Channel name is required and cannot exceed 150 characters.");
        if (!FeeTypes.Contains(request.FeeType))
            throw new AccountingBusinessException("Fee type is invalid.");
        if (request.FeePercentage is < 0 or > 100 || request.FeeFlatCents < 0)
            throw new AccountingBusinessException("Channel fees cannot be negative or exceed 100%.");
        if (request.FeeType == "none" && (request.FeePercentage != 0 || request.FeeFlatCents != 0))
            throw new AccountingBusinessException("Fee type 'none' requires percentage and flat fee to be zero.");
        if (request.FeeType == "percentage" && request.FeeFlatCents != 0)
            throw new AccountingBusinessException("Percentage fee type cannot include a flat fee.");
        if (request.FeeType == "flat" && request.FeePercentage != 0)
            throw new AccountingBusinessException("Flat fee type cannot include a percentage.");
    }

    private static void ValidateSale(CreateAccountingSalesOrderRequest request)
    {
        if (request.CustomerId <= 0 || request.ChannelId <= 0)
            throw new AccountingBusinessException("Choose a customer and sales channel.");
        if (request.Items.Count == 0)
            throw new AccountingBusinessException("Add at least one product.");
        if (request.Items.Any(x => x.ProductId <= 0 || x.Quantity <= 0))
            throw new AccountingBusinessException("Every sale line needs a product and positive quantity.");
        if (request.Items.GroupBy(x => x.ProductId).Any(x => x.Count() > 1))
            throw new AccountingBusinessException("Combine duplicate product lines.");
        if (request.Items.Any(x =>
                x.ListedPriceCents < 0 ||
                x.VatAmountCents < 0))
        {
            throw new AccountingBusinessException("Prices and VAT cannot be negative.");
        }
    }

    private static string NormalizeCurrency(string value)
    {
        var code = value?.Trim().ToUpperInvariant() ?? string.Empty;
        if (code.Length != 3)
            throw new AccountingBusinessException("Currency must be a 3-letter code.");
        return code;
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        if (value == default)
            throw new AccountingBusinessException("Order date is required.");
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    private static long RoundToCents(decimal value) =>
        checked((long)decimal.Round(value, 0, MidpointRounding.AwayFromZero));

    private sealed record PreparedLine(
        Product Product,
        int Quantity,
        long ListedPriceCents,
        long UnitCogsCents,
        long VatAmountCents,
        IReadOnlyList<LotConsumption> LotConsumptions,
        int? ParentIndex);

    private sealed record LotConsumption(int LotId, int Quantity, long UnitCostCents, long TotalCostCents);
}
