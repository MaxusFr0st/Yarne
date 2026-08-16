using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Models;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Data;

namespace YarneAPIBack.Accounting.Services;

public sealed class ProcurementService : IProcurementService
{
    private readonly YarneDbContext _db;

    public ProcurementService(YarneDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<CurrencyDto>> GetCurrenciesAsync(CancellationToken ct = default)
    {
        return await _db.AccountingCurrencies
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.IsActive)
            .OrderByDescending(x => x.IsBase)
            .ThenBy(x => x.Code)
            .Select(x => new CurrencyDto(x.Code, x.Name, x.Symbol, x.IsBase, x.IsActive))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ExchangeRateDto>> GetExchangeRatesAsync(CancellationToken ct = default)
    {
        return await _db.CurrencyExchangeRates
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .OrderByDescending(x => x.EffectiveAt)
            .ThenBy(x => x.FromCurrencyCode)
            .Select(x => new ExchangeRateDto(
                x.Id,
                x.FromCurrencyCode,
                x.ToCurrencyCode,
                x.Rate,
                x.EffectiveAt))
            .ToListAsync(ct);
    }

    public async Task<ExchangeRateDto> SetExchangeRateAsync(
        SetExchangeRateRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        var from = NormalizeCurrency(request.FromCurrencyCode);
        var to = NormalizeCurrency(request.ToCurrencyCode);
        if (from == to)
            throw new AccountingBusinessException("Choose two different currencies.");
        if (request.Rate <= 0)
            throw new AccountingBusinessException("Exchange rate must be greater than zero.");

        await EnsureCurrenciesExistAsync([from, to], ct);
        var effectiveAt = EnsureUtc(request.EffectiveAt, "Effective date");
        var now = DateTime.UtcNow;
        var entity = new CurrencyExchangeRate
        {
            FromCurrencyCode = from,
            ToCurrencyCode = to,
            Rate = decimal.Round(request.Rate, 8, MidpointRounding.AwayFromZero),
            EffectiveAt = effectiveAt,
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.CurrencyExchangeRates.Add(entity);
        await _db.SaveChangesAsync(ct);
        return new ExchangeRateDto(entity.Id, from, to, entity.Rate, effectiveAt);
    }

    public async Task<IReadOnlyList<SupplierDto>> GetSuppliersAsync(CancellationToken ct = default)
    {
        return await _db.Suppliers
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .OrderBy(x => x.Name)
            .Select(x => new SupplierDto(x.Id, x.Name, x.ContactInfo, x.CreatedAt, x.UpdatedAt))
            .ToListAsync(ct);
    }

    public async Task<SupplierDto?> GetSupplierAsync(int id, CancellationToken ct = default)
    {
        return await _db.Suppliers
            .AsNoTracking()
            .Where(x => x.Id == id && !x.IsVoid)
            .Select(x => new SupplierDto(x.Id, x.Name, x.ContactInfo, x.CreatedAt, x.UpdatedAt))
            .SingleOrDefaultAsync(ct);
    }

    public async Task<SupplierDto> CreateSupplierAsync(
        SaveSupplierRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        var name = RequireText(request.Name, "Supplier name", 255);
        if (await _db.Suppliers.AnyAsync(x => !x.IsVoid && x.Name == name, ct))
            throw new AccountingBusinessException($"Supplier '{name}' already exists.");

        var now = DateTime.UtcNow;
        var entity = new Supplier
        {
            Name = name,
            ContactInfo = OptionalText(request.ContactInfo, 1000),
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.Suppliers.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapSupplier(entity);
    }

    public async Task<SupplierDto?> UpdateSupplierAsync(
        int id,
        SaveSupplierRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        var entity = await _db.Suppliers.SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return null;

        var name = RequireText(request.Name, "Supplier name", 255);
        if (await _db.Suppliers.AnyAsync(x => !x.IsVoid && x.Id != id && x.Name == name, ct))
            throw new AccountingBusinessException($"Supplier '{name}' already exists.");

        entity.Name = name;
        entity.ContactInfo = OptionalText(request.ContactInfo, 1000);
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return MapSupplier(entity);
    }

    public async Task<bool> VoidSupplierAsync(int id, int? actorId, CancellationToken ct = default)
    {
        var entity = await _db.Suppliers.SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return false;
        if (await _db.PurchaseOrders.AnyAsync(x => x.SupplierId == id && !x.IsVoid, ct))
            throw new AccountingBusinessException("Void the supplier's purchase orders first.");

        entity.IsVoid = true;
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<PurchaseOrderDto>> GetPurchaseOrdersAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default)
    {
        var query = PurchaseOrderQuery();
        if (from.HasValue)
            query = query.Where(x => x.OrderDate >= EnsureUtc(from.Value, "From date"));
        if (to.HasValue)
            query = query.Where(x => x.OrderDate <= EnsureUtc(to.Value, "To date"));

        var rows = await query.OrderByDescending(x => x.OrderDate).ThenByDescending(x => x.Id).ToListAsync(ct);
        return rows.Select(MapPurchaseOrder).ToList();
    }

    public async Task<PurchaseOrderDto?> GetPurchaseOrderAsync(int id, CancellationToken ct = default)
    {
        var entity = await PurchaseOrderQuery().SingleOrDefaultAsync(x => x.Id == id, ct);
        return entity is null ? null : MapPurchaseOrder(entity);
    }

    public async Task<PurchaseOrderDto> CreatePurchaseOrderAsync(
        SavePurchaseOrderRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidatePurchaseOrder(request);
        await EnsureSupplierExistsAsync(request.SupplierId, ct);
        await EnsureMaterialsExistAsync(request.Items.Select(x => x.MaterialId), ct);
        var currencyCode = NormalizeCurrency(request.CurrencyCode);
        var orderDate = EnsureUtc(request.OrderDate, "Order date");
        var exchangeRate = await ResolveRateToBaseAsync(
            currencyCode,
            request.ExchangeRateToBase,
            orderDate,
            ct);

        var strategy = _db.Database.CreateExecutionStrategy();
        var createdId = 0;
        await strategy.ExecuteAsync(async () =>
        {
            var now = DateTime.UtcNow;
            var entity = new PurchaseOrder
            {
                SupplierId = request.SupplierId,
                OrderDate = orderDate,
                InvoiceRef = OptionalText(request.InvoiceRef, 150),
                Status = request.Status,
                ReceiptUrl = ValidateCloudinaryUrl(request.ReceiptUrl),
                CurrencyCode = currencyCode,
                ExchangeRateToBase = exchangeRate,
                CreatedBy = actorId,
                CreatedAt = now,
                UpdatedAt = now,
                Items = request.Items
                    .Select(item => BuildLine(item, request.Status, exchangeRate, actorId, now))
                    .ToList(),
            };

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            _db.PurchaseOrders.Add(entity);
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            createdId = entity.Id;
        });

        return (await GetPurchaseOrderAsync(createdId, ct))!;
    }

    public async Task<PurchaseOrderDto?> UpdatePurchaseOrderAsync(
        int id,
        SavePurchaseOrderRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidatePurchaseOrder(request);
        var strategy = _db.Database.CreateExecutionStrategy();
        var found = true;
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var entity = await _db.PurchaseOrders
                .Include(x => x.Items)
                .SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
            if (entity is null)
            {
                found = false;
                await transaction.RollbackAsync(ct);
                return;
            }
            if (entity.Status != "draft")
                throw new AccountingBusinessException("Only draft purchase orders can be edited.");
            if (await _db.ProductionMaterialConsumptions.AnyAsync(
                    x => x.PurchaseOrderItem.PurchaseOrderId == id && !x.IsVoid,
                    ct))
            {
                throw new AccountingBusinessException("This purchase order has material consumption and cannot be edited.");
            }

            await EnsureSupplierExistsAsync(request.SupplierId, ct);
            await EnsureMaterialsExistAsync(request.Items.Select(x => x.MaterialId), ct);
            var currencyCode = NormalizeCurrency(request.CurrencyCode);
            var orderDate = EnsureUtc(request.OrderDate, "Order date");
            var exchangeRate = await ResolveRateToBaseAsync(
                currencyCode,
                request.ExchangeRateToBase,
                orderDate,
                ct);
            var now = DateTime.UtcNow;

            foreach (var existingItem in entity.Items)
            {
                existingItem.IsVoid = true;
                existingItem.QuantityRemaining = 0;
                existingItem.CreatedBy ??= actorId;
                existingItem.UpdatedAt = now;
            }
            entity.SupplierId = request.SupplierId;
            entity.OrderDate = orderDate;
            entity.InvoiceRef = OptionalText(request.InvoiceRef, 150);
            entity.Status = request.Status;
            entity.ReceiptUrl = ValidateCloudinaryUrl(request.ReceiptUrl);
            entity.CurrencyCode = currencyCode;
            entity.ExchangeRateToBase = exchangeRate;
            entity.CreatedBy ??= actorId;
            entity.UpdatedAt = now;
            foreach (var item in request.Items.Select(item => BuildLine(item, request.Status, exchangeRate, actorId, now)))
                entity.Items.Add(item);
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        });

        return found ? await GetPurchaseOrderAsync(id, ct) : null;
    }

    public async Task<bool> VoidPurchaseOrderAsync(int id, int? actorId, CancellationToken ct = default)
    {
        var entity = await _db.PurchaseOrders
            .Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return false;
        if (await _db.ProductionMaterialConsumptions.AnyAsync(
                x => x.PurchaseOrderItem.PurchaseOrderId == id && !x.IsVoid,
                ct))
        {
            throw new AccountingBusinessException(
                "This purchase order has FIFO consumption and cannot be voided.");
        }

        var now = DateTime.UtcNow;
        entity.IsVoid = true;
        entity.Status = "cancelled";
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = now;
        foreach (var item in entity.Items)
        {
            item.IsVoid = true;
            item.QuantityRemaining = 0;
            item.CreatedBy ??= actorId;
            item.UpdatedAt = now;
        }
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private IQueryable<PurchaseOrder> PurchaseOrderQuery()
    {
        return _db.PurchaseOrders
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .Include(x => x.Supplier)
            .Include(x => x.Items.Where(item => !item.IsVoid))
                .ThenInclude(x => x.Material);
    }

    private async Task<decimal> ResolveRateToBaseAsync(
        string currencyCode,
        decimal? suppliedRate,
        DateTime effectiveAt,
        CancellationToken ct)
    {
        var baseCode = await _db.AccountingCurrencies
            .Where(x => x.IsBase && x.IsActive && !x.IsVoid)
            .Select(x => x.Code)
            .SingleOrDefaultAsync(ct)
            ?? throw new AccountingBusinessException("Configure one base currency before posting transactions.");

        await EnsureCurrenciesExistAsync([currencyCode, baseCode], ct);
        if (currencyCode == baseCode)
        {
            if (suppliedRate.HasValue && suppliedRate.Value != 1m)
                throw new AccountingBusinessException("Base-currency exchange rate must be 1.");
            return 1m;
        }

        if (suppliedRate.HasValue)
        {
            if (suppliedRate.Value <= 0)
                throw new AccountingBusinessException("Exchange rate must be greater than zero.");
            return decimal.Round(suppliedRate.Value, 8, MidpointRounding.AwayFromZero);
        }

        var rate = await _db.CurrencyExchangeRates
            .Where(x =>
                !x.IsVoid &&
                x.FromCurrencyCode == currencyCode &&
                x.ToCurrencyCode == baseCode &&
                x.EffectiveAt <= effectiveAt)
            .OrderByDescending(x => x.EffectiveAt)
            .Select(x => (decimal?)x.Rate)
            .FirstOrDefaultAsync(ct);

        return rate ?? throw new AccountingBusinessException(
            $"Set a {currencyCode}/{baseCode} exchange rate for this date.");
    }

    private async Task EnsureSupplierExistsAsync(int id, CancellationToken ct)
    {
        if (!await _db.Suppliers.AnyAsync(x => x.Id == id && !x.IsVoid, ct))
            throw new AccountingBusinessException("Supplier was not found.");
    }

    private async Task EnsureMaterialsExistAsync(IEnumerable<int> ids, CancellationToken ct)
    {
        var distinctIds = ids.Distinct().ToArray();
        var count = await _db.Materials.CountAsync(
            x => distinctIds.Contains(x.Id) && x.IsActive && !x.IsVoid,
            ct);
        if (count != distinctIds.Length)
            throw new AccountingBusinessException("One or more materials are missing or inactive.");
    }

    private async Task EnsureCurrenciesExistAsync(IEnumerable<string> codes, CancellationToken ct)
    {
        var distinctCodes = codes.Distinct().ToArray();
        var count = await _db.AccountingCurrencies.CountAsync(
            x => distinctCodes.Contains(x.Code) && x.IsActive && !x.IsVoid,
            ct);
        if (count != distinctCodes.Length)
            throw new AccountingBusinessException("One or more currencies are unavailable.");
    }

    private static PurchaseOrderItem BuildLine(
        SavePurchaseOrderItemRequest request,
        string status,
        decimal exchangeRate,
        int? actorId,
        DateTime now)
    {
        // Roll-tracked lines carry the exact per-roll invoice price; use it directly for the
        // line total instead of QuantityPurchased * UnitPriceCents, which would compound the
        // rounding baked into UnitPriceCents (a whole-cent-per-base-unit figure) across the
        // full quantity and drift away from what was actually paid.
        var totalCostCents = request.RollPriceCents.HasValue && request.ItemCount.HasValue
            ? (long)request.ItemCount.Value * request.RollPriceCents.Value
            : RoundToCents(request.QuantityPurchased * request.UnitPriceCents);
        // Lots only become consumable when the PO is received.
        var quantityRemaining = status == "received" ? request.QuantityPurchased : 0m;
        return new PurchaseOrderItem
        {
            MaterialId = request.MaterialId,
            QuantityPurchased = request.QuantityPurchased,
            QuantityRemaining = quantityRemaining,
            UnitPriceCents = request.UnitPriceCents,
            TotalCostCents = totalCostCents,
            VatAmountCents = request.VatAmountCents,
            BaseUnitPriceCents = RoundToCents(request.UnitPriceCents * exchangeRate),
            BaseTotalCostCents = RoundToCents(totalCostCents * exchangeRate),
            BaseVatAmountCents = RoundToCents(request.VatAmountCents * exchangeRate),
            ItemCount = request.ItemCount,
            LengthPerItem = request.LengthPerItem,
            RollPriceCents = request.RollPriceCents,
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    private const decimal ItemShapeTolerance = 0.0001m;

    private static (int? WholeItemsRemaining, decimal? PartialRemainder) DeriveItemBreakdown(
        int? itemCount,
        decimal? lengthPerItem,
        decimal quantityRemaining)
    {
        if (itemCount is null || lengthPerItem is null || lengthPerItem.Value <= 0)
            return (null, null);

        var wholeItems = Math.Floor(quantityRemaining / lengthPerItem.Value);
        var remainder = quantityRemaining - wholeItems * lengthPerItem.Value;
        // Guard against floating-point-ish decimal noise pushing the remainder
        // just over the item length (e.g. 119.99999... -> whole+1, remainder~0).
        if (remainder >= lengthPerItem.Value - ItemShapeTolerance)
        {
            wholeItems += 1;
            remainder = 0m;
        }
        else if (remainder < 0m)
        {
            remainder = 0m;
        }
        return ((int)wholeItems, remainder);
    }

    private static PurchaseOrderDto MapPurchaseOrder(PurchaseOrder entity)
    {
        var items = entity.Items
            .Where(x => !x.IsVoid)
            .OrderBy(x => x.Id)
            .Select(x =>
            {
                var (wholeItems, partial) = DeriveItemBreakdown(x.ItemCount, x.LengthPerItem, x.QuantityRemaining);
                return new PurchaseOrderItemDto(
                    x.Id,
                    x.MaterialId,
                    x.Material.Name,
                    x.Material.Unit,
                    x.QuantityPurchased,
                    x.QuantityRemaining,
                    x.UnitPriceCents,
                    x.TotalCostCents,
                    x.VatAmountCents,
                    x.BaseUnitPriceCents,
                    x.BaseTotalCostCents,
                    x.BaseVatAmountCents,
                    x.ItemCount,
                    x.LengthPerItem,
                    x.RollPriceCents,
                    wholeItems,
                    partial);
            })
            .ToList();
        return new PurchaseOrderDto(
            entity.Id,
            entity.SupplierId,
            entity.Supplier.Name,
            entity.OrderDate,
            entity.InvoiceRef,
            entity.Status,
            entity.ReceiptUrl,
            entity.CurrencyCode,
            entity.ExchangeRateToBase,
            items.Sum(x => x.TotalCostCents),
            items.Sum(x => x.VatAmountCents),
            items.Sum(x => x.BaseTotalCostCents),
            entity.CreatedAt,
            entity.UpdatedAt,
            items);
    }

    private static SupplierDto MapSupplier(Supplier entity) =>
        new(entity.Id, entity.Name, entity.ContactInfo, entity.CreatedAt, entity.UpdatedAt);

    private static void ValidatePurchaseOrder(SavePurchaseOrderRequest request)
    {
        // Cancelled is only reached via VoidPurchaseOrderAsync — never on create/update.
        if (request.Status is not ("draft" or "received"))
            throw new AccountingBusinessException("Purchase order status must be draft or received.");
        if (request.Items.Count == 0)
            throw new AccountingBusinessException("Add at least one material line.");
        if (request.Items.Any(x => x.MaterialId <= 0))
            throw new AccountingBusinessException("Choose a material for every line.");
        if (request.Items.GroupBy(x => x.MaterialId).Any(group => group.Count() > 1))
            throw new AccountingBusinessException("Combine duplicate material lines.");
        if (request.Items.Any(x => x.QuantityPurchased <= 0))
            throw new AccountingBusinessException("Purchased quantity must be greater than zero.");
        if (request.Items.Any(x => x.UnitPriceCents < 0 || x.VatAmountCents < 0))
            throw new AccountingBusinessException("Prices and VAT cannot be negative.");
        if (request.Items.Any(x =>
        {
            var lineTotal = RoundToCents(x.QuantityPurchased * x.UnitPriceCents);
            return x.VatAmountCents > lineTotal;
        }))
            throw new AccountingBusinessException("VAT cannot exceed the line total cost.");

        foreach (var item in request.Items)
        {
            if (item.ItemCount is null && item.LengthPerItem is null)
                continue;
            if (item.ItemCount is null || item.LengthPerItem is null)
                throw new AccountingBusinessException("Roll count and length-per-roll must both be set, or both left blank.");
            if (item.ItemCount <= 0 || item.LengthPerItem <= 0)
                throw new AccountingBusinessException("Roll count and length-per-roll must be greater than zero.");
            var expected = item.ItemCount.Value * item.LengthPerItem.Value;
            if (Math.Abs(expected - item.QuantityPurchased) > ItemShapeTolerance)
                throw new AccountingBusinessException(
                    "Rolls x length-per-roll must equal the purchased quantity.");
        }
    }

    private static string NormalizeCurrency(string value)
    {
        var code = RequireText(value, "Currency", 3).ToUpperInvariant();
        if (code.Length != 3)
            throw new AccountingBusinessException("Currency must be a 3-letter code.");
        return code;
    }

    private static string RequireText(string? value, string label, int maxLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
            throw new AccountingBusinessException($"{label} is required.");
        if (normalized.Length > maxLength)
            throw new AccountingBusinessException($"{label} cannot exceed {maxLength} characters.");
        return normalized;
    }

    private static string? OptionalText(string? value, int maxLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
            return null;
        if (normalized.Length > maxLength)
            throw new AccountingBusinessException($"Value cannot exceed {maxLength} characters.");
        return normalized;
    }

    private static string? ValidateCloudinaryUrl(string? value)
    {
        var normalized = OptionalText(value, 2048);
        if (normalized is null)
            return null;
        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps ||
            !uri.Host.EndsWith("cloudinary.com", StringComparison.OrdinalIgnoreCase))
        {
            throw new AccountingBusinessException("Receipt must be a secure Cloudinary URL.");
        }
        return normalized;
    }

    private static DateTime EnsureUtc(DateTime value, string label)
    {
        if (value == default)
            throw new AccountingBusinessException($"{label} is required.");
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    private static long RoundToCents(decimal value)
    {
        return checked((long)decimal.Round(value, 0, MidpointRounding.AwayFromZero));
    }
}
