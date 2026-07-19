using System.Data;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Models;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Data;

namespace YarneAPIBack.Accounting.Services;

public sealed class ProductionService : IProductionService
{
    private readonly YarneDbContext _db;

    public ProductionService(YarneDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ProductionOrderDto>> GetProductionOrdersAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default)
    {
        var query = ProductionQuery();
        if (from.HasValue)
            query = query.Where(x => x.ProductionDate >= EnsureUtc(from.Value));
        if (to.HasValue)
            query = query.Where(x => x.ProductionDate <= EnsureUtc(to.Value));
        var rows = await query
            .OrderByDescending(x => x.ProductionDate)
            .ThenByDescending(x => x.Id)
            .ToListAsync(ct);
        return rows.Select(Map).ToList();
    }

    public async Task<ProductionOrderDto?> GetProductionOrderAsync(
        int id,
        CancellationToken ct = default)
    {
        var row = await ProductionQuery().SingleOrDefaultAsync(x => x.Id == id, ct);
        return row is null ? null : Map(row);
    }

    public async Task<ProductionOrderDto> CompleteProductionAsync(
        CreateProductionOrderRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        if (request.ProductId <= 0)
            throw new AccountingBusinessException("Choose a product.");
        if (request.QuantityProduced <= 0)
            throw new AccountingBusinessException("Produced quantity must be greater than zero.");
        if (request.QuantityRejected < 0 || request.QuantityRejected >= request.QuantityProduced)
            throw new AccountingBusinessException(
                "Rejected quantity must be zero or more and lower than produced quantity.");
        if (request.Notes?.Trim().Length > 2000)
            throw new AccountingBusinessException("Notes cannot exceed 2,000 characters.");
        if (request.ColorId.HasValue != request.SizeId.HasValue)
            throw new AccountingBusinessException(
                "A variant tag needs both a color and a size (or neither).");
        if (request.Lace && !request.ColorId.HasValue)
            throw new AccountingBusinessException(
                "Lace can only be set together with a color and size tag.");

        var strategy = _db.Database.CreateExecutionStrategy();
        int productionOrderId = 0;
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct);
            var product = await _db.Products
                .FromSqlInterpolated(
                    $"""SELECT * FROM "Product" WHERE "Id" = {request.ProductId} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (product is null || product.IsVoid)
                throw new AccountingBusinessException("Product was not found.");

            if (request.ColorId.HasValue &&
                !await _db.Colors.AnyAsync(x => x.Id == request.ColorId.Value, ct))
            {
                throw new AccountingBusinessException("The tagged color was not found.");
            }
            if (request.SizeId.HasValue &&
                !await _db.Sizes.AnyAsync(x => x.Id == request.SizeId.Value, ct))
            {
                throw new AccountingBusinessException("The tagged size was not found.");
            }

            var bom = await _db.ProductBoms
                .Include(x => x.Items.Where(item => !item.IsVoid))
                    .ThenInclude(x => x.Material)
                .SingleOrDefaultAsync(x => x.ProductId == request.ProductId && !x.IsVoid, ct);
            if (bom is null)
                throw new AccountingBusinessException("Set up this product's BOM before production.");
            if (bom.Items.Count == 0)
                throw new AccountingBusinessException("Add at least one material to the BOM.");

            var productionDate = EnsureUtc(request.ProductionDate);
            var now = DateTime.UtcNow;
            var order = new ProductionOrder
            {
                ProductId = product.Id,
                QuantityProduced = request.QuantityProduced,
                QuantityRejected = request.QuantityRejected,
                ProductionDate = productionDate,
                Status = "completed",
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                CreatedBy = actorId,
                CreatedAt = now,
                UpdatedAt = now,
            };

            // Lock every material's FIFO lot list once up front, and verify the whole run
            // fits before consuming anything — same guarantees as before the per-unit rewrite.
            var requirements = bom.Items.OrderBy(x => x.MaterialId).ToList();
            var lotCursors = new Dictionary<int, LotCursor>();
            foreach (var requirement in requirements)
            {
                var lots = await _db.PurchaseOrderItems
                    .FromSqlInterpolated(
                        $"""
                         SELECT lot.*
                         FROM "PurchaseOrderItem" lot
                         JOIN "PurchaseOrder" purchase ON purchase."Id" = lot."PurchaseOrderId"
                         WHERE lot."MaterialId" = {requirement.MaterialId}
                           AND lot."QuantityRemaining" > 0
                           AND lot."IsVoid" = false
                           AND purchase."IsVoid" = false
                           AND purchase."Status" = 'received'
                         ORDER BY purchase."OrderDate", lot."Id"
                         FOR UPDATE OF lot
                         """)
                    .ToListAsync(ct);

                var requiredQuantity = requirement.QuantityRequired * request.QuantityProduced;
                var available = lots.Sum(x => x.QuantityRemaining);
                if (available < requiredQuantity)
                {
                    throw new AccountingBusinessException(
                        $"Not enough {requirement.Material.Name}. " +
                        $"Required {requiredQuantity:0.####} {requirement.Material.Unit}, " +
                        $"available {available:0.####} {requirement.Material.Unit}.");
                }
                lotCursors[requirement.MaterialId] = new LotCursor(lots);
            }

            var labourRate = await ResolveRateToBaseAsync(
                bom.CurrencyCode,
                productionDate,
                ct);
            var labourPerUnitBaseCents = RoundToCents(bom.LabourCostCents * labourRate);

            // Consume material one unit at a time so a run that crosses from a cheaper
            // raw-material lot into a dearer one mid-run keeps distinct per-unit costs
            // instead of blending everything into one batch average. The FIFO cursor keeps
            // rolling forward across units — the same locked lot rows keep decrementing.
            long totalMaterialCost = 0;
            var unitCostCents = new long[request.QuantityProduced];
            var consumptionByLot = new Dictionary<int, ProductionMaterialConsumption>();
            for (var unit = 0; unit < request.QuantityProduced; unit++)
            {
                long unitMaterialCost = 0;
                foreach (var requirement in requirements)
                {
                    var cursor = lotCursors[requirement.MaterialId];
                    var quantityLeft = requirement.QuantityRequired;
                    while (quantityLeft > 0)
                    {
                        var lot = cursor.Current
                            ?? throw new AccountingBusinessException(
                                $"Not enough {requirement.Material.Name} in stock.");
                        var quantityUsed = decimal.Min(lot.QuantityRemaining, quantityLeft);
                        var sliceCost = RoundToCents(quantityUsed * lot.BaseUnitPriceCents);
                        lot.QuantityRemaining -= quantityUsed;
                        lot.UpdatedAt = now;
                        unitMaterialCost = checked(unitMaterialCost + sliceCost);
                        if (consumptionByLot.TryGetValue(lot.Id, out var existing))
                        {
                            existing.QuantityUsed += quantityUsed;
                            existing.TotalCostCents = checked(existing.TotalCostCents + sliceCost);
                        }
                        else
                        {
                            var consumption = new ProductionMaterialConsumption
                            {
                                PurchaseOrderItemId = lot.Id,
                                QuantityUsed = quantityUsed,
                                UnitCostAtUseCents = lot.BaseUnitPriceCents,
                                TotalCostCents = sliceCost,
                                CreatedBy = actorId,
                                CreatedAt = now,
                                UpdatedAt = now,
                            };
                            consumptionByLot[lot.Id] = consumption;
                            order.MaterialConsumptions.Add(consumption);
                        }
                        quantityLeft -= quantityUsed;
                        if (lot.QuantityRemaining <= 0)
                            cursor.Advance();
                    }
                }
                totalMaterialCost = checked(totalMaterialCost + unitMaterialCost);
                unitCostCents[unit] = checked(unitMaterialCost + labourPerUnitBaseCents);
            }

            var totalLabourCost = checked(labourPerUnitBaseCents * request.QuantityProduced);
            var totalCogs = checked(totalMaterialCost + totalLabourCost);
            order.TotalMaterialCostCents = totalMaterialCost;
            order.TotalLabourCostCents = totalLabourCost;
            order.TotalCogsCents = totalCogs;
            _db.ProductionOrders.Add(order);

            // Units are sequential: the first N-rejected units are the accepted ones, the
            // trailing rejected units are scrap. Their material was still really consumed,
            // so their exact per-unit cost lands in ScrapCostCents (a P&L loss), never in
            // finished-goods value.
            var acceptedQuantity = request.QuantityProduced - request.QuantityRejected;
            long acceptedCogs = 0;
            for (var unit = 0; unit < acceptedQuantity; unit++)
                acceptedCogs = checked(acceptedCogs + unitCostCents[unit]);
            order.CapitalizedCogsCents = acceptedCogs;
            order.ScrapCostCents = totalCogs - acceptedCogs;

            var inventory = await _db.FinishedGoodsInventories
                .FromSqlInterpolated(
                    $"""
                     SELECT * FROM "FinishedGoodsInventory"
                     WHERE "ProductId" = {request.ProductId}
                     FOR UPDATE
                     """)
                .SingleOrDefaultAsync(ct);
            if (inventory is null)
            {
                inventory = new FinishedGoodsInventory
                {
                    ProductId = request.ProductId,
                    CreatedBy = actorId,
                    CreatedAt = now,
                };
                _db.FinishedGoodsInventories.Add(inventory);
            }

            var oldInventoryValue = (decimal)inventory.QuantityOnHand * inventory.AverageUnitCostCents;
            var newQuantity = checked(inventory.QuantityOnHand + acceptedQuantity);
            inventory.QuantityOnHand = newQuantity;
            // AverageUnitCostCents is a display-only rollup — sales price COGS off the
            // FIFO lots below, not this pooled average.
            inventory.AverageUnitCostCents = RoundToCents(
                (oldInventoryValue + acceptedCogs) / newQuantity);
            inventory.CreatedBy ??= actorId;
            inventory.UpdatedAt = now;

            // Group consecutive accepted units with identical unit cost into one lot: a run
            // of 3 where units 1-2 came out of one raw lot and unit 3 crossed into a dearer
            // one yields two FinishedGoodsLot rows (qty 2 at X, qty 1 at Y). Sales
            // FIFO-consume these oldest-first (CreatedAt then Id), so cheaper units sell
            // first — consistent with raw-material FIFO.
            var groupStart = 0;
            while (groupStart < acceptedQuantity)
            {
                var groupEnd = groupStart;
                while (groupEnd + 1 < acceptedQuantity &&
                       unitCostCents[groupEnd + 1] == unitCostCents[groupStart])
                {
                    groupEnd++;
                }
                var groupQuantity = groupEnd - groupStart + 1;
                _db.FinishedGoodsLots.Add(new FinishedGoodsLot
                {
                    ProductId = request.ProductId,
                    ProductionOrder = order,
                    QuantityProduced = groupQuantity,
                    QuantityRemaining = groupQuantity,
                    UnitCostCents = unitCostCents[groupStart],
                    ColorId = request.ColorId,
                    SizeId = request.SizeId,
                    Lace = request.ColorId.HasValue && request.Lace,
                    CreatedBy = actorId,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                groupStart = groupEnd + 1;
            }

            product.QuantityInStock = checked(product.QuantityInStock + acceptedQuantity);
            product.CreatedBy ??= actorId;
            product.UpdatedAt = now;

            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            productionOrderId = order.Id;
        });

        return (await GetProductionOrderAsync(productionOrderId, ct))!;
    }

    public async Task<bool> VoidProductionOrderAsync(
        int id,
        int? actorId,
        CancellationToken ct = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        var found = true;
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct);
            var order = await _db.ProductionOrders
                .FromSqlInterpolated(
                    $"""SELECT * FROM "ProductionOrder" WHERE "Id" = {id} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (order is null || order.IsVoid)
            {
                found = false;
                await transaction.RollbackAsync(ct);
                return;
            }
            if (order.Status != "completed")
                throw new AccountingBusinessException("Only completed production runs can be voided.");

            await _db.Entry(order)
                .Collection(x => x.MaterialConsumptions)
                .Query()
                .Where(x => !x.IsVoid)
                .LoadAsync(ct);

            var acceptedQuantity = order.QuantityProduced - order.QuantityRejected;
            var now = DateTime.UtcNow;

            var product = await _db.Products
                .FromSqlInterpolated(
                    $"""SELECT * FROM "Product" WHERE "Id" = {order.ProductId} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (product is null || product.IsVoid)
                throw new AccountingBusinessException("Product was not found.");

            var inventory = await _db.FinishedGoodsInventories
                .FromSqlInterpolated(
                    $"""
                     SELECT * FROM "FinishedGoodsInventory"
                     WHERE "ProductId" = {order.ProductId}
                     FOR UPDATE
                     """)
                .SingleOrDefaultAsync(ct);
            var fgLots = await _db.FinishedGoodsLots
                .FromSqlInterpolated(
                    $"""
                     SELECT * FROM "FinishedGoodsLot"
                     WHERE "ProductionOrderId" = {order.Id}
                     ORDER BY "Id"
                     FOR UPDATE
                     """)
                .ToListAsync(ct);

            // Can only reverse a run cleanly if none of its units have sold yet — check
            // every lot this run created, not the pooled product total, since other runs'
            // stock must not block (or falsely permit) voiding this one.
            if (inventory is null || inventory.IsVoid ||
                fgLots.Count == 0 ||
                fgLots.Any(lot => lot.IsVoid || lot.QuantityRemaining < lot.QuantityProduced))
            {
                throw new AccountingBusinessException(
                    "Some units from this run are no longer in stock (already sold or moved) — cannot void.");
            }
            if (product.QuantityInStock < acceptedQuantity)
                throw new AccountingBusinessException(
                    "Storefront stock for this product is lower than this run's quantity — cannot void.");

            var newQuantity = inventory.QuantityOnHand - acceptedQuantity;
            var oldValue = (decimal)inventory.QuantityOnHand * inventory.AverageUnitCostCents;
            inventory.QuantityOnHand = newQuantity;
            inventory.AverageUnitCostCents = newQuantity == 0
                ? 0
                : RoundToCents((oldValue - order.CapitalizedCogsCents) / newQuantity);
            inventory.UpdatedAt = now;

            foreach (var fgLot in fgLots)
            {
                // Units already applied to a storefront variant must not survive the void
                // as phantom listed stock — pull them back out of ProductVariantStock.
                if (fgLot.AppliedToStorefrontQuantity > 0 &&
                    fgLot.ColorId.HasValue && fgLot.SizeId.HasValue)
                {
                    var variantRow = await _db.ProductVariantStocks
                        .FromSqlInterpolated(
                            $"""
                             SELECT * FROM "ProductVariantStock"
                             WHERE "ProductId" = {fgLot.ProductId}
                               AND "ColorId" = {fgLot.ColorId.Value}
                               AND "SizeId" = {fgLot.SizeId.Value}
                               AND "Lace" = {fgLot.Lace}
                             FOR UPDATE
                             """)
                        .SingleOrDefaultAsync(ct);
                    if (variantRow is not null)
                    {
                        variantRow.QuantityInStock = Math.Max(
                            0,
                            variantRow.QuantityInStock - fgLot.AppliedToStorefrontQuantity);
                    }
                }
                fgLot.IsVoid = true;
                fgLot.UpdatedAt = now;
            }

            product.QuantityInStock -= acceptedQuantity;
            product.UpdatedAt = now;

            foreach (var consumption in order.MaterialConsumptions)
            {
                var lot = await _db.PurchaseOrderItems
                    .FromSqlInterpolated(
                        $"""
                         SELECT * FROM "PurchaseOrderItem"
                         WHERE "Id" = {consumption.PurchaseOrderItemId}
                         FOR UPDATE
                         """)
                    .SingleOrDefaultAsync(ct);
                if (lot is not null)
                {
                    lot.QuantityRemaining += consumption.QuantityUsed;
                    lot.UpdatedAt = now;
                }
                consumption.IsVoid = true;
                consumption.UpdatedAt = now;
            }

            order.IsVoid = true;
            order.Status = "voided";
            order.UpdatedAt = now;

            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        });
        return found;
    }

    public async Task<IReadOnlyList<FinishedGoodsStockProductDto>> GetFinishedGoodsStockAsync(
        CancellationToken ct = default)
    {
        var lots = await _db.FinishedGoodsLots
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.QuantityRemaining > 0 && !x.Product.IsVoid)
            .Include(x => x.Product)
            .Include(x => x.ProductionOrder)
            .Include(x => x.Color)
            .Include(x => x.Size)
            .ToListAsync(ct);

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

        return lots
            .GroupBy(x => x.Product)
            .OrderBy(group => group.Key.Name)
            .Select(group =>
            {
                var product = group.Key;
                // Same margin convention as the product margin-alert system:
                // (selling − cost) / selling × 100, both sides in base currency.
                long? sellingBaseCents =
                    product.SellingPriceCents > 0 &&
                    latestRates.TryGetValue(product.SellingCurrencyCode, out var sellingRate)
                        ? RoundToCents(product.SellingPriceCents * sellingRate)
                        : null;
                var lotDtos = group
                    .OrderBy(x => x.ProductionOrder.ProductionDate)
                    .ThenBy(x => x.Id)
                    .Select(lot => new FinishedGoodsStockLotDto(
                        lot.Id,
                        lot.ProductionOrderId,
                        lot.ProductionOrder.ProductionDate,
                        lot.QuantityProduced,
                        lot.QuantityRemaining,
                        lot.AppliedToStorefrontQuantity,
                        lot.UnitCostCents,
                        lot.ColorId,
                        lot.Color?.Name,
                        lot.SizeId,
                        lot.Size?.Name,
                        lot.Lace,
                        sellingBaseCents > 0
                            ? decimal.Round(
                                (sellingBaseCents.Value - lot.UnitCostCents) * 100m / sellingBaseCents.Value,
                                2,
                                MidpointRounding.AwayFromZero)
                            : null))
                    .ToList();
                return new FinishedGoodsStockProductDto(
                    product.Id,
                    product.Name,
                    product.ProductCode,
                    product.SellingPriceCents,
                    product.SellingCurrencyCode,
                    group.Sum(x => x.QuantityRemaining),
                    lotDtos);
            })
            .ToList();
    }

    public async Task<IReadOnlyList<VariantProducedAvailabilityDto>> GetVariantProducedAvailabilityAsync(
        int productId,
        CancellationToken ct = default)
    {
        var lots = await _db.FinishedGoodsLots
            .AsNoTracking()
            .Where(x =>
                !x.IsVoid &&
                x.ProductId == productId &&
                x.ColorId != null &&
                x.SizeId != null)
            .Select(x => new
            {
                ColorId = x.ColorId!.Value,
                SizeId = x.SizeId!.Value,
                x.Lace,
                x.QuantityRemaining,
                x.AppliedToStorefrontQuantity,
            })
            .ToListAsync(ct);

        return lots
            .GroupBy(x => new { x.ColorId, x.SizeId, x.Lace })
            .Select(group => new VariantProducedAvailabilityDto(
                group.Key.ColorId,
                group.Key.SizeId,
                group.Key.Lace,
                group.Sum(x => Math.Max(0, x.QuantityRemaining - x.AppliedToStorefrontQuantity))))
            .Where(x => x.AvailableQuantity > 0)
            .OrderBy(x => x.ColorId)
            .ThenBy(x => x.SizeId)
            .ThenBy(x => x.Lace)
            .ToList();
    }

    public async Task<ApplyVariantStockResultDto> ApplyVariantStockAsync(
        ApplyVariantStockRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        if (request.ProductId <= 0 || request.ColorId <= 0 || request.SizeId <= 0)
            throw new AccountingBusinessException("Choose a product, color, and size.");
        if (request.Quantity <= 0)
            throw new AccountingBusinessException("Quantity to apply must be greater than zero.");

        var result = new ApplyVariantStockResultDto(0, 0);
        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct);
            var now = DateTime.UtcNow;

            var lots = await _db.FinishedGoodsLots
                .FromSqlInterpolated(
                    $"""
                     SELECT lot.*
                     FROM "FinishedGoodsLot" lot
                     JOIN "ProductionOrder" run ON run."Id" = lot."ProductionOrderId"
                     WHERE lot."ProductId" = {request.ProductId}
                       AND lot."ColorId" = {request.ColorId}
                       AND lot."SizeId" = {request.SizeId}
                       AND lot."Lace" = {request.Lace}
                       AND lot."IsVoid" = false
                     ORDER BY run."ProductionDate", lot."Id"
                     FOR UPDATE OF lot
                     """)
                .ToListAsync(ct);

            var available = lots.Sum(x =>
                Math.Max(0, x.QuantityRemaining - x.AppliedToStorefrontQuantity));
            if (request.Quantity > available)
            {
                throw new AccountingBusinessException(
                    $"Only {available} produced unit(s) of this variant are still unapplied.");
            }

            // The storefront variant row requires the product to actually offer this
            // color/size combination (FK to the ProductColor/ProductSize junctions).
            var hasColor = await _db.ProductColors.AnyAsync(
                x => x.ProductId == request.ProductId && x.ColorId == request.ColorId,
                ct);
            var hasSize = await _db.ProductSizes.AnyAsync(
                x => x.ProductId == request.ProductId && x.SizeId == request.SizeId,
                ct);
            if (!hasColor || !hasSize)
            {
                throw new AccountingBusinessException(
                    "Add this color and size to the product's storefront listing first.");
            }

            var quantityLeft = request.Quantity;
            foreach (var lot in lots)
            {
                if (quantityLeft <= 0)
                    break;
                var lotAvailable = Math.Max(0, lot.QuantityRemaining - lot.AppliedToStorefrontQuantity);
                if (lotAvailable <= 0)
                    continue;
                var applied = Math.Min(lotAvailable, quantityLeft);
                lot.AppliedToStorefrontQuantity += applied;
                lot.UpdatedAt = now;
                quantityLeft -= applied;
            }

            var variantRow = await _db.ProductVariantStocks
                .FromSqlInterpolated(
                    $"""
                     SELECT * FROM "ProductVariantStock"
                     WHERE "ProductId" = {request.ProductId}
                       AND "ColorId" = {request.ColorId}
                       AND "SizeId" = {request.SizeId}
                       AND "Lace" = {request.Lace}
                     FOR UPDATE
                     """)
                .SingleOrDefaultAsync(ct);
            if (variantRow is null)
            {
                variantRow = new YarneAPIBack.Models.ProductVariantStock
                {
                    ProductId = request.ProductId,
                    ColorId = request.ColorId,
                    SizeId = request.SizeId,
                    Lace = request.Lace,
                    QuantityInStock = request.Quantity,
                };
                _db.ProductVariantStocks.Add(variantRow);
            }
            else
            {
                variantRow.QuantityInStock = checked(variantRow.QuantityInStock + request.Quantity);
            }

            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            result = new ApplyVariantStockResultDto(
                variantRow.QuantityInStock,
                available - request.Quantity);
        });
        return result;
    }

    private IQueryable<ProductionOrder> ProductionQuery()
    {
        return _db.ProductionOrders
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .Include(x => x.Product)
            .Include(x => x.MaterialConsumptions.Where(consumption => !consumption.IsVoid))
                .ThenInclude(x => x.PurchaseOrderItem)
                    .ThenInclude(x => x.Material)
            .Include(x => x.FinishedGoodsLots.Where(lot => !lot.IsVoid))
                .ThenInclude(x => x.Color)
            .Include(x => x.FinishedGoodsLots.Where(lot => !lot.IsVoid))
                .ThenInclude(x => x.Size);
    }

    private async Task<decimal> ResolveRateToBaseAsync(
        string currencyCode,
        DateTime effectiveAt,
        CancellationToken ct)
    {
        var baseCode = await _db.AccountingCurrencies
            .Where(x => x.IsBase && x.IsActive && !x.IsVoid)
            .Select(x => x.Code)
            .SingleAsync(ct);
        if (currencyCode == baseCode)
            return 1m;

        return await _db.CurrencyExchangeRates
            .Where(x =>
                !x.IsVoid &&
                x.FromCurrencyCode == currencyCode &&
                x.ToCurrencyCode == baseCode &&
                x.EffectiveAt <= effectiveAt)
            .OrderByDescending(x => x.EffectiveAt)
            .Select(x => (decimal?)x.Rate)
            .FirstOrDefaultAsync(ct)
            ?? throw new AccountingBusinessException(
                $"Set a {currencyCode}/{baseCode} exchange rate for the production date.");
    }

    private static ProductionOrderDto Map(ProductionOrder entity)
    {
        return new ProductionOrderDto(
            entity.Id,
            entity.ProductId,
            entity.Product.Name,
            entity.Product.ProductCode,
            entity.QuantityProduced,
            entity.QuantityRejected,
            entity.QuantityProduced - entity.QuantityRejected,
            entity.ProductionDate,
            entity.TotalMaterialCostCents,
            entity.TotalLabourCostCents,
            entity.TotalCogsCents,
            entity.ScrapCostCents,
            entity.Status,
            entity.Notes,
            entity.CreatedAt,
            entity.MaterialConsumptions
                .Where(x => !x.IsVoid)
                .OrderBy(x => x.Id)
                .Select(x => new ProductionConsumptionDto(
                    x.Id,
                    x.PurchaseOrderItemId,
                    x.PurchaseOrderItem.MaterialId,
                    x.PurchaseOrderItem.Material.Name,
                    x.QuantityUsed,
                    x.UnitCostAtUseCents,
                    x.TotalCostCents))
                .ToList(),
            entity.FinishedGoodsLots
                .Where(x => !x.IsVoid)
                .OrderBy(x => x.Id)
                .Select(x => new ProductionLotDto(
                    x.Id,
                    x.QuantityProduced,
                    x.QuantityRemaining,
                    x.UnitCostCents,
                    x.ColorId,
                    x.Color?.Name,
                    x.SizeId,
                    x.Size?.Name,
                    x.Lace))
                .ToList());
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        if (value == default)
            throw new AccountingBusinessException("Production date is required.");
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    private static long RoundToCents(decimal value) =>
        checked((long)decimal.Round(value, 0, MidpointRounding.AwayFromZero));

    /// <summary>
    /// Rolling FIFO position over a material's locked purchase lots. Consumption keeps
    /// decrementing the same tracked entities across units, so a lot is drained exactly
    /// once and each lot is touched by a contiguous range of units.
    /// </summary>
    private sealed class LotCursor
    {
        private readonly List<PurchaseOrderItem> _lots;
        private int _index;

        public LotCursor(List<PurchaseOrderItem> lots)
        {
            _lots = lots;
        }

        public PurchaseOrderItem? Current
        {
            get
            {
                while (_index < _lots.Count && _lots[_index].QuantityRemaining <= 0)
                    _index++;
                return _index < _lots.Count ? _lots[_index] : null;
            }
        }

        public void Advance()
        {
            if (_index < _lots.Count)
                _index++;
        }
    }
}
