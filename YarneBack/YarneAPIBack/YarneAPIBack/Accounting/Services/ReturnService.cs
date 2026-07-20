using System.Data;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Models;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Data;

namespace YarneAPIBack.Accounting.Services;

public sealed class ReturnService : IReturnService
{
    private static readonly HashSet<string> Reasons =
        new(StringComparer.Ordinal) { "customer_request", "defective", "wrong_item", "other" };
    private static readonly HashSet<string> Resolutions =
        new(StringComparer.Ordinal) { "restock", "reclaim_materials", "write_off" };

    private readonly YarneDbContext _db;

    public ReturnService(YarneDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ReturnOrderDto>> GetReturnsAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default)
    {
        var query = ReturnQuery();
        if (from.HasValue)
            query = query.Where(x => x.ReturnDate >= EnsureUtc(from.Value));
        if (to.HasValue)
            query = query.Where(x => x.ReturnDate <= EnsureUtc(to.Value));
        var rows = await query.OrderByDescending(x => x.ReturnDate).ThenByDescending(x => x.Id).ToListAsync(ct);
        return rows.Select(Map).ToList();
    }

    public async Task<ReturnOrderDto?> GetReturnAsync(int id, CancellationToken ct = default)
    {
        var entity = await ReturnQuery().SingleOrDefaultAsync(x => x.Id == id, ct);
        return entity is null ? null : Map(entity);
    }

    public async Task<ReturnOrderDto> CreateReturnAsync(
        CreateReturnOrderRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        Validate(request);
        var strategy = _db.Database.CreateExecutionStrategy();
        var createdId = 0;
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct);

            var sale = await _db.Orders
                .FromSqlInterpolated(
                    $"""SELECT * FROM "Order" WHERE "Id" = {request.SalesOrderId} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (sale is null || sale.IsVoid)
                throw new AccountingBusinessException("Sales order was not found.");

            await _db.Entry(sale)
                .Collection(x => x.OrderItems)
                .Query()
                .Where(item => !item.IsVoid)
                .LoadAsync(ct);

            var requestedByItem = request.Items.ToDictionary(x => x.SalesOrderItemId);
            var saleItems = sale.OrderItems
                .Where(x => requestedByItem.ContainsKey(x.Id))
                .ToDictionary(x => x.Id);
            if (saleItems.Count != requestedByItem.Count)
                throw new AccountingBusinessException("One or more return items do not belong to this sale.");

            // Reserve against all non-cancelled drafts + completed returns so concurrent
            // create/complete cannot over-allocate the same sale lines.
            var previouslyReturned = await _db.ReturnOrderItems
                .Where(x =>
                    requestedByItem.Keys.Contains(x.SalesOrderItemId) &&
                    !x.IsVoid &&
                    !x.ReturnOrder.IsVoid &&
                    x.ReturnOrder.Status != "cancelled")
                .GroupBy(x => x.SalesOrderItemId)
                .Select(group => new { ItemId = group.Key, Quantity = group.Sum(x => x.Quantity) })
                .ToDictionaryAsync(x => x.ItemId, x => x.Quantity, ct);

            var prepared = new List<(YarneAPIBack.Models.OrderItem Item, int Quantity, long EligibleGross)>();
            foreach (var (itemId, requested) in requestedByItem)
            {
                var saleItem = saleItems[itemId];
                var remaining = saleItem.Quantity - previouslyReturned.GetValueOrDefault(itemId);
                if (requested.Quantity > remaining)
                    throw new AccountingBusinessException(
                        $"Return quantity for '{saleItem.ProductName}' exceeds {remaining} available.");
                prepared.Add((
                    saleItem,
                    requested.Quantity,
                    checked(saleItem.ListedPriceCents * requested.Quantity)));
            }

            var eligibleTotal = prepared.Sum(x => x.EligibleGross);
            if (request.RefundAmountCents > eligibleTotal)
                throw new AccountingBusinessException("Refund exceeds the returned items' listed value.");

            // Guided-cascade guard: a composed component (child) line cannot be returned in a
            // quantity exceeding its parent (bag) line's total returned quantity — you can't
            // return more lace than bags. Parent's total = previously returned + this request.
            var childItems = saleItems.Values.Where(x => x.ParentOrderItemId.HasValue).ToList();
            if (childItems.Count > 0)
            {
                var requestedQtyByItem = requestedByItem.ToDictionary(x => x.Key, x => x.Value.Quantity);
                var parentIds = childItems.Select(x => x.ParentOrderItemId!.Value).Distinct().ToList();
                var allIds = requestedByItem.Keys.Concat(parentIds).Distinct().ToList();
                var returnedByItem = await _db.ReturnOrderItems
                    .Where(x =>
                        allIds.Contains(x.SalesOrderItemId) &&
                        !x.IsVoid &&
                        !x.ReturnOrder.IsVoid &&
                        x.ReturnOrder.Status != "cancelled")
                    .GroupBy(x => x.SalesOrderItemId)
                    .Select(group => new { ItemId = group.Key, Quantity = group.Sum(x => x.Quantity) })
                    .ToDictionaryAsync(x => x.ItemId, x => x.Quantity, ct);
                foreach (var child in childItems)
                {
                    var parentId = child.ParentOrderItemId!.Value;
                    var childTotal = returnedByItem.GetValueOrDefault(child.Id)
                        + requestedQtyByItem.GetValueOrDefault(child.Id);
                    var parentTotal = returnedByItem.GetValueOrDefault(parentId)
                        + requestedQtyByItem.GetValueOrDefault(parentId);
                    if (childTotal > parentTotal)
                        throw new AccountingBusinessException(
                            $"Cannot return more of '{child.ProductName}' than its parent line " +
                            $"({parentTotal} returned).");
                }
            }

            var now = DateTime.UtcNow;
            var returnOrder = new ReturnOrder
            {
                SalesOrderId = request.SalesOrderId,
                ReturnDate = EnsureUtc(request.ReturnDate),
                Reason = request.Reason,
                Resolution = request.Resolution,
                RefundAmountCents = request.RefundAmountCents,
                CurrencyCode = sale.CurrencyCode,
                ExchangeRateToBase = sale.ExchangeRateToBase,
                Status = "draft",
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                CreatedBy = actorId,
                CreatedAt = now,
                UpdatedAt = now,
            };

            var remainingRefund = request.RefundAmountCents;
            var remainingEligible = eligibleTotal;
            for (var index = 0; index < prepared.Count; index++)
            {
                var line = prepared[index];
                var lineRefund = index == prepared.Count - 1 || remainingEligible <= 0
                    ? remainingRefund
                    : RoundToCents((decimal)remainingRefund * line.EligibleGross / remainingEligible);

                // VAT reverse tracks the refund share, not just returned qty — a partial
                // refund on a full-qty return must reverse VAT proportionally.
                var vatForReturnedQty = line.Item.Quantity == 0
                    ? 0
                    : RoundToCents((decimal)line.Item.VatAmountCents * line.Quantity / line.Item.Quantity);
                var vatReversed = line.EligibleGross <= 0
                    ? 0
                    : RoundToCents((decimal)vatForReturnedQty * lineRefund / line.EligibleGross);

                var cogsReversed = request.Resolution == "restock"
                    ? checked(line.Item.UnitCogsCents * line.Quantity)
                    : 0;

                // Channel fees stay charged on the platform even after a refund in reality,
                // but the portion attributable to returned units must leave P&L too —
                // otherwise fees stay fully expensed against revenue that no longer exists.
                var feeForReturnedQty = line.Item.Quantity == 0
                    ? 0
                    : RoundToCents((decimal)line.Item.ChannelFeeShareCents * line.Quantity / line.Item.Quantity);
                var feeReversed = line.EligibleGross <= 0
                    ? 0
                    : RoundToCents((decimal)feeForReturnedQty * lineRefund / line.EligibleGross);

                returnOrder.Items.Add(new ReturnOrderItem
                {
                    SalesOrderItemId = line.Item.Id,
                    Quantity = line.Quantity,
                    RefundAmountCents = lineRefund,
                    VatReversedCents = vatReversed,
                    CogsReversedCents = cogsReversed,
                    FeeReversedCents = feeReversed,
                    CreatedBy = actorId,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                remainingRefund -= lineRefund;
                remainingEligible -= line.EligibleGross;
            }

            _db.ReturnOrders.Add(returnOrder);
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            createdId = returnOrder.Id;
        });

        return (await GetReturnAsync(createdId, ct))!;
    }

    public async Task<ReturnOrderDto?> CompleteReturnAsync(
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
            var entity = await _db.ReturnOrders
                .FromSqlInterpolated($"""SELECT * FROM "ReturnOrder" WHERE "Id" = {id} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (entity is null || entity.IsVoid)
            {
                found = false;
                await transaction.RollbackAsync(ct);
                return;
            }
            if (entity.Status != "draft")
                throw new AccountingBusinessException("Only draft returns can be completed.");

            await _db.Entry(entity)
                .Collection(x => x.Items)
                .Query()
                .Where(x => !x.IsVoid)
                .Include(x => x.SalesOrderItem)
                    .ThenInclude(x => x.FinishedGoodsConsumptions.Where(c => !c.IsVoid))
                .LoadAsync(ct);

            // Lock the parent sale so concurrent completes serialize on the same order.
            var sale = await _db.Orders
                .FromSqlInterpolated(
                    $"""SELECT * FROM "Order" WHERE "Id" = {entity.SalesOrderId} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (sale is null || sale.IsVoid)
                throw new AccountingBusinessException("Sales order was not found.");

            var requestedIds = entity.Items.Select(x => x.SalesOrderItemId).ToArray();
            // Include other drafts — completing two drafts for the same lines must fail.
            var previouslyReturned = await _db.ReturnOrderItems
                .Where(x =>
                    requestedIds.Contains(x.SalesOrderItemId) &&
                    !x.IsVoid &&
                    !x.ReturnOrder.IsVoid &&
                    x.ReturnOrder.Status != "cancelled" &&
                    x.ReturnOrderId != entity.Id)
                .GroupBy(x => x.SalesOrderItemId)
                .Select(group => new { ItemId = group.Key, Quantity = group.Sum(x => x.Quantity) })
                .ToDictionaryAsync(x => x.ItemId, x => x.Quantity, ct);

            foreach (var item in entity.Items)
            {
                var remaining = item.SalesOrderItem.Quantity - previouslyReturned.GetValueOrDefault(item.SalesOrderItemId);
                if (item.Quantity > remaining)
                {
                    throw new AccountingBusinessException(
                        $"Return quantity for '{item.SalesOrderItem.ProductName}' exceeds {remaining} available.");
                }
            }

            var now = DateTime.UtcNow;
            if (entity.Resolution == "restock")
            {
                var byProduct = entity.Items
                    .GroupBy(x => x.SalesOrderItem.ProductId)
                    .ToList();
                foreach (var group in byProduct.OrderBy(x => x.Key))
                {
                    if (!group.Key.HasValue)
                        throw new AccountingBusinessException("A returned product no longer exists.");
                    var productId = group.Key.Value;
                    var product = await _db.Products
                        .FromSqlInterpolated(
                            $"""SELECT * FROM "Product" WHERE "Id" = {productId} FOR UPDATE""")
                        .SingleAsync(ct);
                    var inventory = await _db.FinishedGoodsInventories
                        .FromSqlInterpolated(
                            $"""
                             SELECT * FROM "FinishedGoodsInventory"
                             WHERE "ProductId" = {productId}
                             FOR UPDATE
                             """)
                        .SingleOrDefaultAsync(ct);
                    if (inventory is null)
                    {
                        inventory = new FinishedGoodsInventory
                        {
                            ProductId = productId,
                            CreatedBy = actorId,
                            CreatedAt = now,
                        };
                        _db.FinishedGoodsInventories.Add(inventory);
                    }

                    var quantity = group.Sum(x => x.Quantity);
                    var reversedCogs = group.Sum(x => x.CogsReversedCents);
                    var oldValue = (decimal)inventory.QuantityOnHand * inventory.AverageUnitCostCents;
                    inventory.QuantityOnHand = checked(inventory.QuantityOnHand + quantity);
                    inventory.AverageUnitCostCents = RoundToCents(
                        (oldValue + reversedCogs) / inventory.QuantityOnHand);
                    inventory.CreatedBy ??= actorId;
                    inventory.UpdatedAt = now;
                    product.QuantityInStock = checked(product.QuantityInStock + quantity);
                    product.UpdatedAt = now;
                }

                // Credit the exact FG lot(s) each returned unit was originally sold from —
                // proportional to the consumption split recorded at sale time — so future
                // FIFO sales still cost off the correct batch.
                foreach (var item in entity.Items)
                    await CreditFinishedGoodsLotsAsync(item, now, ct);
            }
            else if (entity.Resolution == "reclaim_materials")
            {
                foreach (var item in entity.Items)
                    await ReclaimRawMaterialsAsync(item, actorId, now, ct);
            }

            entity.Status = "completed";
            entity.CreatedBy ??= actorId;
            entity.UpdatedAt = now;
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        });
        return found ? await GetReturnAsync(id, ct) : null;
    }

    /// <summary>
    /// Splits a returned quantity across the FinishedGoodsLot(s) the sale actually drew from,
    /// proportional to each lot's share of the original sale — the last consumption row
    /// absorbs any rounding remainder so the shares always sum to the returned quantity.
    /// </summary>
    private static List<(int LotId, int Share)> SplitAcrossConsumptions(
        IReadOnlyList<SalesFinishedGoodsConsumption> consumptions,
        int soldQuantity,
        int returnedQuantity)
    {
        var result = new List<(int LotId, int Share)>();
        var remaining = returnedQuantity;
        var ordered = consumptions.OrderBy(x => x.Id).ToList();
        for (var index = 0; index < ordered.Count; index++)
        {
            var consumption = ordered[index];
            int share;
            if (index == ordered.Count - 1)
                share = remaining;
            else if (soldQuantity <= 0)
                share = 0;
            else
                share = (int)Math.Round((decimal)returnedQuantity * consumption.Quantity / soldQuantity, MidpointRounding.AwayFromZero);
            share = Math.Clamp(share, 0, remaining);
            if (share > 0)
                result.Add((consumption.FinishedGoodsLotId, share));
            remaining -= share;
        }
        return result;
    }

    private async Task CreditFinishedGoodsLotsAsync(
        ReturnOrderItem item,
        DateTime now,
        CancellationToken ct)
    {
        var consumptions = item.SalesOrderItem.FinishedGoodsConsumptions.ToList();
        if (consumptions.Count == 0)
            return;
        var shares = SplitAcrossConsumptions(consumptions, item.SalesOrderItem.Quantity, item.Quantity);
        foreach (var (lotId, share) in shares)
        {
            var lot = await _db.FinishedGoodsLots
                .FromSqlInterpolated($"""SELECT * FROM "FinishedGoodsLot" WHERE "Id" = {lotId} FOR UPDATE""")
                .SingleOrDefaultAsync(ct);
            if (lot is null)
                continue;
            lot.QuantityRemaining = Math.Min(lot.QuantityProduced, lot.QuantityRemaining + share);
            lot.UpdatedAt = now;
        }
    }

    /// <summary>
    /// "Unmakes" the returned bag: traces it back through its FinishedGoodsLot to the
    /// production run that made it, then through that run's material consumptions back to the
    /// exact raw-material lots, crediting the recovered quantity for reuse. Labour cost is not
    /// recovered — it's a real loss, same spirit as a write-off, just narrower.
    /// </summary>
    private async Task ReclaimRawMaterialsAsync(
        ReturnOrderItem item,
        int? actorId,
        DateTime now,
        CancellationToken ct)
    {
        var consumptions = item.SalesOrderItem.FinishedGoodsConsumptions.ToList();
        if (consumptions.Count == 0)
            return;
        var shares = SplitAcrossConsumptions(consumptions, item.SalesOrderItem.Quantity, item.Quantity);
        long reclaimedValueCents = 0;
        foreach (var (lotId, bagsReturned) in shares)
        {
            var fgLot = await _db.FinishedGoodsLots
                .AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == lotId, ct);
            if (fgLot is null || fgLot.QuantityProduced <= 0)
                continue;

            var materialConsumptions = await _db.ProductionMaterialConsumptions
                .AsNoTracking()
                .Where(x => x.ProductionOrderId == fgLot.ProductionOrderId && !x.IsVoid)
                .ToListAsync(ct);
            // Material was consumed against the run's full produced quantity (including
            // rejects), so that — not the lot's accepted quantity — is the per-unit basis.
            var productionOrder = await _db.ProductionOrders
                .AsNoTracking()
                .SingleAsync(x => x.Id == fgLot.ProductionOrderId, ct);
            if (productionOrder.QuantityProduced <= 0)
                continue;

            foreach (var consumption in materialConsumptions.OrderBy(x => x.Id))
            {
                var reclaimQty = consumption.QuantityUsed * bagsReturned / productionOrder.QuantityProduced;
                if (reclaimQty <= 0)
                    continue;
                var materialLot = await _db.PurchaseOrderItems
                    .FromSqlInterpolated(
                        $"""SELECT * FROM "PurchaseOrderItem" WHERE "Id" = {consumption.PurchaseOrderItemId} FOR UPDATE""")
                    .SingleOrDefaultAsync(ct);
                if (materialLot is null)
                    continue;
                materialLot.QuantityRemaining = Math.Min(
                    materialLot.QuantityPurchased,
                    materialLot.QuantityRemaining + reclaimQty);
                materialLot.UpdatedAt = now;
                reclaimedValueCents = checked(reclaimedValueCents + RoundToCents(reclaimQty * materialLot.BaseUnitPriceCents));
            }
        }
        item.MaterialsReclaimedCents = reclaimedValueCents;
        item.UpdatedAt = now;
    }

    public async Task<bool> VoidDraftReturnAsync(
        int id,
        int? actorId,
        CancellationToken ct = default)
    {
        var entity = await _db.ReturnOrders
            .Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return false;
        if (entity.Status != "draft")
            throw new AccountingBusinessException("Completed returns cannot be voided.");
        var now = DateTime.UtcNow;
        entity.Status = "cancelled";
        entity.IsVoid = true;
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = now;
        foreach (var item in entity.Items)
        {
            item.IsVoid = true;
            item.UpdatedAt = now;
        }
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private IQueryable<ReturnOrder> ReturnQuery() =>
        _db.ReturnOrders
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .Include(x => x.Items.Where(item => !item.IsVoid))
                .ThenInclude(x => x.SalesOrderItem)
            .Include(x => x.SalesOrder);

    private static void Validate(CreateReturnOrderRequest request)
    {
        if (request.SalesOrderId <= 0)
            throw new AccountingBusinessException("Choose a sales order.");
        if (!Reasons.Contains(request.Reason))
            throw new AccountingBusinessException("Return reason is invalid.");
        if (!Resolutions.Contains(request.Resolution))
            throw new AccountingBusinessException("Return resolution is invalid.");
        if (request.RefundAmountCents < 0)
            throw new AccountingBusinessException("Refund cannot be negative.");
        if (request.Items.Count == 0)
            throw new AccountingBusinessException("Add at least one return line.");
        if (request.Items.Any(x => x.SalesOrderItemId <= 0 || x.Quantity <= 0))
            throw new AccountingBusinessException("Each return line needs a sale item and positive quantity.");
        if (request.Items.GroupBy(x => x.SalesOrderItemId).Any(g => g.Count() > 1))
            throw new AccountingBusinessException("Combine duplicate return lines for the same sale item.");
    }

    private static ReturnOrderDto Map(ReturnOrder entity) =>
        new(
            entity.Id,
            entity.SalesOrderId,
            entity.ReturnDate,
            entity.Reason,
            entity.Resolution,
            entity.RefundAmountCents,
            entity.CurrencyCode,
            entity.Status,
            entity.Notes,
            entity.CreatedAt,
            entity.UpdatedAt,
            entity.Items
                .Where(x => !x.IsVoid)
                .Select(x => new ReturnOrderItemDto(
                    x.Id,
                    x.SalesOrderItemId,
                    x.SalesOrderItem.ProductId ?? 0,
                    x.SalesOrderItem.ProductName,
                    x.Quantity,
                    x.RefundAmountCents,
                    x.VatReversedCents,
                    x.CogsReversedCents,
                    x.FeeReversedCents,
                    x.MaterialsReclaimedCents))
                .ToList());

    private static DateTime EnsureUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static long RoundToCents(decimal value) =>
        (long)decimal.Round(value, 0, MidpointRounding.AwayFromZero);
}
