using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Models;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Data;
using YarneAPIBack.Models;

namespace YarneAPIBack.Accounting.Services;

public sealed class ProductAccountingService : IProductAccountingService
{
    private readonly YarneDbContext _db;

    public ProductAccountingService(YarneDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AccountingProductDto>> GetProductsAsync(CancellationToken ct = default)
    {
        var products = await ProductQuery()
            .OrderBy(x => x.Name)
            .ToListAsync(ct);
        return await MapProductsAsync(products, ct);
    }

    public async Task<AccountingProductDto?> GetProductAsync(int id, CancellationToken ct = default)
    {
        var product = await ProductQuery().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (product is null)
            return null;
        return (await MapProductsAsync([product], ct)).Single();
    }

    public async Task<AccountingProductDto?> UpdateProductAccountingAsync(
        int id,
        UpdateProductAccountingRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        if (request.SellingPriceCents < 0)
            throw new AccountingBusinessException("Selling price cannot be negative.");
        if (request.MarginThresholdPct is < 0 or > 100)
            throw new AccountingBusinessException("Margin threshold must be between 0% and 100%.");

        var currencyCode = NormalizeCurrency(request.SellingCurrencyCode);
        await EnsureCurrencyExistsAsync(currencyCode, ct);
        var product = await _db.Products.SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (product is null)
            return null;

        product.SellingPriceCents = request.SellingPriceCents;
        product.SellingCurrencyCode = currencyCode;
        product.MarginThresholdPct = decimal.Round(
            request.MarginThresholdPct,
            2,
            MidpointRounding.AwayFromZero);
        product.CreatedBy ??= actorId;
        product.UpdatedAt = DateTime.UtcNow;

        // The storefront's legacy Price column is UAH-only. Keep it synchronized only
        // when the admin explicitly saves a UAH accounting price.
        if (currencyCode == "UAH")
            product.Price = request.SellingPriceCents / 100m;

        await _db.SaveChangesAsync(ct);
        return await GetProductAsync(id, ct);
    }

    public async Task<AccountingProductDto?> SaveBomAsync(
        int productId,
        SaveProductBomRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        if (request.LabourCostCents < 0)
            throw new AccountingBusinessException("Labour cost cannot be negative.");
        if (request.Items.Any(x => x.MaterialId <= 0 || x.QuantityRequired <= 0))
            throw new AccountingBusinessException("Every BOM line needs a material and positive quantity.");
        if (request.Items.GroupBy(x => x.MaterialId).Any(group => group.Count() > 1))
            throw new AccountingBusinessException("Combine duplicate materials in the BOM.");

        var currencyCode = NormalizeCurrency(request.CurrencyCode);
        await EnsureCurrencyExistsAsync(currencyCode, ct);
        var materialIds = request.Items.Select(x => x.MaterialId).Distinct().ToArray();
        var availableMaterialCount = await _db.Materials.CountAsync(
            x => materialIds.Contains(x.Id) && x.IsActive && !x.IsVoid,
            ct);
        if (availableMaterialCount != materialIds.Length)
            throw new AccountingBusinessException("One or more BOM materials are missing or inactive.");

        var product = await _db.Products.SingleOrDefaultAsync(x => x.Id == productId && !x.IsVoid, ct);
        if (product is null)
            return null;

        var bom = await _db.ProductBoms
            .Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.ProductId == productId && !x.IsVoid, ct);
        var now = DateTime.UtcNow;
        if (bom is null)
        {
            bom = new ProductBom
            {
                ProductId = productId,
                CreatedBy = actorId,
                CreatedAt = now,
            };
            _db.ProductBoms.Add(bom);
        }

        bom.LabourCostCents = request.LabourCostCents;
        bom.CurrencyCode = currencyCode;
        bom.CreatedBy ??= actorId;
        bom.UpdatedAt = now;

        var requestedByMaterial = request.Items.ToDictionary(x => x.MaterialId);
        foreach (var existing in bom.Items)
        {
            if (requestedByMaterial.Remove(existing.MaterialId, out var requested))
            {
                existing.QuantityRequired = requested.QuantityRequired;
                existing.IsVoid = false;
                existing.CreatedBy ??= actorId;
                existing.UpdatedAt = now;
            }
            else
            {
                existing.IsVoid = true;
                existing.CreatedBy ??= actorId;
                existing.UpdatedAt = now;
            }
        }

        foreach (var requested in requestedByMaterial.Values)
        {
            bom.Items.Add(new ProductBomItem
            {
                MaterialId = requested.MaterialId,
                QuantityRequired = requested.QuantityRequired,
                CreatedBy = actorId,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        product.CreatedBy ??= actorId;
        product.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);
        return await GetProductAsync(productId, ct);
    }

    public async Task<AccountingProductDto?> SetInternalComponentAsync(
        int id,
        bool isInternalComponent,
        int? actorId,
        CancellationToken ct = default)
    {
        var product = await _db.Products.SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (product is null)
            return null;

        // A product used as a component in another product's recipe cannot itself be sold on the
        // storefront while also being internal — but marking it internal is exactly what we want.
        // Guard the reverse: don't allow un-marking a product that is still referenced as a
        // component elsewhere, otherwise it would leak into the public catalog.
        if (!isInternalComponent && product.IsInternalComponent)
        {
            var stillReferenced = await _db.ProductSaleComponents
                .AnyAsync(sc => !sc.IsVoid && sc.ComponentProductId == id, ct);
            if (stillReferenced)
                throw new AccountingBusinessException(
                    "This product is still used as a sale component of another product. " +
                    "Remove it from those recipes before making it public again.");
        }

        product.IsInternalComponent = isInternalComponent;
        product.CreatedBy ??= actorId;
        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await GetProductAsync(id, ct);
    }

    public async Task<AccountingProductDto?> SaveSaleComponentsAsync(
        int productId,
        SaveProductSaleComponentsRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        var items = request.Components ?? new List<SaveProductSaleComponentItemRequest>();
        if (items.Any(x => x.ComponentProductId <= 0 || x.Quantity <= 0))
            throw new AccountingBusinessException("Every component needs a product and positive quantity.");
        foreach (var item in items)
        {
            if (item.Condition is not ("with_lace" or "always"))
                throw new AccountingBusinessException("Component condition must be 'with_lace' or 'always'.");
            if (item.ComponentProductId == productId)
                throw new AccountingBusinessException("A product cannot be a component of itself.");
            if (item.Condition == "with_lace" && item.ColorId is null)
                throw new AccountingBusinessException("Every 'with_lace' row needs a lace color.");
            if (item.Condition == "always" && item.ColorId is not null)
                throw new AccountingBusinessException("'always' (packaging) rows cannot have a color.");
        }
        if (items.GroupBy(x => (x.ComponentProductId, x.Condition, x.ColorId)).Any(g => g.Count() > 1))
            throw new AccountingBusinessException("Combine duplicate component + condition + color rows.");
        if (items.Where(x => x.Condition == "with_lace")
                .GroupBy(x => x.ColorId)
                .Any(g => g.Count() > 1))
            throw new AccountingBusinessException("Each lace color can only be mapped once per product.");

        var product = await _db.Products.SingleOrDefaultAsync(x => x.Id == productId && !x.IsVoid, ct);
        if (product is null)
            return null;

        var componentIds = items.Select(x => x.ComponentProductId).Distinct().ToArray();
        if (componentIds.Length > 0)
        {
            var validComponents = await _db.Products
                .Where(p => componentIds.Contains(p.Id) && !p.IsVoid)
                .Select(p => p.Id)
                .ToListAsync(ct);
            var missing = componentIds.Except(validComponents).ToList();
            if (missing.Count > 0)
                throw new AccountingBusinessException("One or more component products were not found.");
        }

        var colorIds = items.Where(x => x.ColorId.HasValue).Select(x => x.ColorId!.Value).Distinct().ToArray();
        if (colorIds.Length > 0)
        {
            var validColors = await _db.Colors
                .Where(c => colorIds.Contains(c.Id))
                .Select(c => c.Id)
                .ToListAsync(ct);
            var missingColors = colorIds.Except(validColors).ToList();
            if (missingColors.Count > 0)
                throw new AccountingBusinessException("One or more lace colors were not found.");
        }

        var existing = await _db.ProductSaleComponents
            .Where(sc => sc.ProductId == productId)
            .ToListAsync(ct);
        var now = DateTime.UtcNow;
        var requestedByKey = items.ToDictionary(x => (x.ComponentProductId, x.Condition, x.ColorId));

        foreach (var row in existing)
        {
            if (requestedByKey.Remove((row.ComponentProductId, row.Condition, row.ColorId), out var requested))
            {
                row.Quantity = requested.Quantity;
                row.IsVoid = false;
                row.CreatedBy ??= actorId;
                row.UpdatedAt = now;
            }
            else if (!row.IsVoid)
            {
                row.IsVoid = true;
                row.CreatedBy ??= actorId;
                row.UpdatedAt = now;
            }
        }

        foreach (var requested in requestedByKey.Values)
        {
            _db.ProductSaleComponents.Add(new ProductSaleComponent
            {
                ProductId = productId,
                ComponentProductId = requested.ComponentProductId,
                Quantity = requested.Quantity,
                Condition = requested.Condition,
                ColorId = requested.ColorId,
                CreatedBy = actorId,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        product.CreatedBy ??= actorId;
        product.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);
        return await GetProductAsync(productId, ct);
    }

    private IQueryable<Product> ProductQuery()
    {
        return _db.Products
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .Include(x => x.Bom)
                .ThenInclude(x => x!.Items.Where(item => !item.IsVoid))
                    .ThenInclude(x => x.Material)
            .Include(x => x.SaleComponents.Where(sc => !sc.IsVoid))
                .ThenInclude(sc => sc.ComponentProduct)
            .Include(x => x.SaleComponents.Where(sc => !sc.IsVoid))
                .ThenInclude(sc => sc.Color);
    }

    private async Task<IReadOnlyList<AccountingProductDto>> MapProductsAsync(
        IReadOnlyList<Product> products,
        CancellationToken ct)
    {
        var fifoLotRows = await _db.PurchaseOrderItems
            .AsNoTracking()
            .Where(x =>
                !x.IsVoid &&
                !x.PurchaseOrder.IsVoid &&
                x.PurchaseOrder.Status == "received")
            .Select(x => new
            {
                x.MaterialId,
                x.BaseUnitPriceCents,
                x.PurchaseOrder.OrderDate,
                x.Id,
                x.QuantityRemaining,
            })
            .ToListAsync(ct);
        // Margin alerts are forward-looking, so cost should reflect the lot FIFO will consume
        // next in production: the oldest lot with remaining quantity, mirroring ProductionService.
        var nextFifoMaterialCosts = fifoLotRows
            .GroupBy(x => x.MaterialId)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var oldestRemaining = group
                        .Where(x => x.QuantityRemaining > 0)
                        .OrderBy(x => x.OrderDate)
                        .ThenBy(x => x.Id)
                        .FirstOrDefault();
                    if (oldestRemaining is not null)
                        return oldestRemaining.BaseUnitPriceCents;

                    // All lots for this material are fully consumed; fall back to the most
                    // recently purchased price so the margin calc still has a reasonable estimate.
                    return group
                        .OrderByDescending(x => x.OrderDate)
                        .ThenByDescending(x => x.Id)
                        .First()
                        .BaseUnitPriceCents;
                });

        var baseCurrencyCode = await _db.AccountingCurrencies
            .AsNoTracking()
            .Where(x => x.IsBase && x.IsActive && !x.IsVoid)
            .Select(x => x.Code)
            .SingleAsync(ct);
        var now = DateTime.UtcNow;
        var latestRates = (await _db.CurrencyExchangeRates
                .AsNoTracking()
                .Where(x => !x.IsVoid && x.ToCurrencyCode == baseCurrencyCode && x.EffectiveAt <= now)
                .OrderByDescending(x => x.EffectiveAt)
                .ToListAsync(ct))
            .GroupBy(x => x.FromCurrencyCode)
            .ToDictionary(group => group.Key, group => group.First().Rate);
        latestRates[baseCurrencyCode] = 1m;

        return products
            .Select(product => MapProduct(product, nextFifoMaterialCosts, latestRates))
            .ToList();
    }

    private static AccountingProductDto MapProduct(
        Product product,
        IReadOnlyDictionary<int, long> nextFifoMaterialCosts,
        IReadOnlyDictionary<string, decimal> latestRates)
    {
        var bomItems = new List<ProductBomItemDto>();
        var missingMaterials = new List<string>();
        long materialCostCents = 0;
        if (product.Bom is not null)
        {
            foreach (var item in product.Bom.Items.Where(x => !x.IsVoid).OrderBy(x => x.Material.Name))
            {
                nextFifoMaterialCosts.TryGetValue(item.MaterialId, out var latestUnitCost);
                long? lineCost = null;
                if (nextFifoMaterialCosts.ContainsKey(item.MaterialId))
                {
                    lineCost = RoundToCents(item.QuantityRequired * latestUnitCost);
                    materialCostCents = checked(materialCostCents + lineCost.Value);
                }
                else
                {
                    missingMaterials.Add(item.Material.Name);
                }

                bomItems.Add(new ProductBomItemDto(
                    item.Id,
                    item.MaterialId,
                    item.Material.Name,
                    item.Material.Unit,
                    item.QuantityRequired,
                    lineCost.HasValue ? latestUnitCost : null,
                    lineCost));
            }
        }

        var labourRateAvailable = product.Bom is null ||
            latestRates.TryGetValue(product.Bom.CurrencyCode, out _);
        var sellingRateAvailable = latestRates.TryGetValue(product.SellingCurrencyCode, out var sellingRate);
        var labourRate = product.Bom is not null && labourRateAvailable
            ? latestRates[product.Bom.CurrencyCode]
            : 0m;
        var labourBaseCents = product.Bom is null
            ? 0L
            : labourRateAvailable
                ? RoundToCents(product.Bom.LabourCostCents * labourRate)
                : 0L;
        var costAvailable = product.Bom is not null &&
            missingMaterials.Count == 0 &&
            labourRateAvailable &&
            sellingRateAvailable &&
            product.SellingPriceCents > 0;

        long? bomCostCents = costAvailable
            ? checked(materialCostCents + labourBaseCents)
            : null;
        long? sellingBaseCents = sellingRateAvailable
            ? RoundToCents(product.SellingPriceCents * sellingRate)
            : null;
        decimal? marginPct = costAvailable && sellingBaseCents > 0
            ? decimal.Round(
                (sellingBaseCents.Value - bomCostCents!.Value) * 100m / sellingBaseCents.Value,
                2,
                MidpointRounding.AwayFromZero)
            : null;
        var flagged = marginPct.HasValue && marginPct.Value < product.MarginThresholdPct;

        ProductBomDto? bom = product.Bom is null
            ? null
            : new ProductBomDto(
                product.Bom.Id,
                product.Bom.LabourCostCents,
                product.Bom.CurrencyCode,
                bomItems);
        var saleComponents = product.SaleComponents
            .Where(sc => !sc.IsVoid)
            .OrderBy(sc => sc.Condition)
            .ThenBy(sc => sc.ComponentProduct.Name)
            .Select(sc => new ProductSaleComponentDto(
                sc.Id,
                sc.ComponentProductId,
                sc.ComponentProduct.Name,
                sc.ComponentProduct.ProductCode,
                sc.Quantity,
                sc.Condition,
                sc.ComponentProduct.SellingPriceCents,
                sc.ComponentProduct.SellingCurrencyCode,
                sc.ColorId,
                sc.Color != null ? sc.Color.Name : null,
                sc.Color != null ? sc.Color.HexCode : null))
            .ToList();

        return new AccountingProductDto(
            product.Id,
            product.Name,
            product.ProductCode,
            product.Description,
            product.SellingPriceCents,
            product.SellingCurrencyCode,
            product.MarginThresholdPct,
            product.IsInternalComponent,
            bom,
            new ProductMarginDto(
                costAvailable,
                bomCostCents,
                sellingBaseCents,
                marginPct,
                product.MarginThresholdPct,
                flagged,
                missingMaterials),
            saleComponents);
    }

    private async Task EnsureCurrencyExistsAsync(string code, CancellationToken ct)
    {
        if (!await _db.AccountingCurrencies.AnyAsync(
                x => x.Code == code && x.IsActive && !x.IsVoid,
                ct))
        {
            throw new AccountingBusinessException($"Currency '{code}' is unavailable.");
        }
    }

    private static string NormalizeCurrency(string value)
    {
        var code = value?.Trim().ToUpperInvariant() ?? string.Empty;
        if (code.Length != 3)
            throw new AccountingBusinessException("Currency must be a 3-letter code.");
        return code;
    }

    private static long RoundToCents(decimal value) =>
        checked((long)decimal.Round(value, 0, MidpointRounding.AwayFromZero));
}
