using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Data;

namespace YarneAPIBack.Accounting.Services;

public sealed class AccountingReportsV3Service : IAccountingReportsV3Service
{
    private readonly YarneDbContext _db;
    private readonly IProductAccountingService _products;

    public AccountingReportsV3Service(
        YarneDbContext db,
        IProductAccountingService products)
    {
        _db = db;
        _products = products;
    }

    public async Task<AccountingDashboardV3Dto> GetDashboardAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default)
    {
        var fromUtc = from.HasValue ? EnsureUtc(from.Value) : (DateTime?)null;
        var toUtc = to.HasValue ? EnsureUtc(to.Value) : (DateTime?)null;
        var baseCurrency = await _db.AccountingCurrencies
            .AsNoTracking()
            .Where(x => x.IsBase && x.IsActive && !x.IsVoid)
            .Select(x => x.Code)
            .SingleAsync(ct);

        // Recognize revenue only after the order leaves Pending — storefront checkouts
        // start as Pending and must not inflate P&L / channel / VAT reports early.
        var salesQuery = _db.Orders
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.Status != "Canceled" && x.Status != "Pending")
            .Include(x => x.Channel)
            .Include(x => x.Customer)
            .Include(x => x.OrderItems.Where(item => !item.IsVoid))
                .ThenInclude(x => x.Product)
            .AsQueryable();
        if (fromUtc.HasValue)
            salesQuery = salesQuery.Where(x => x.OrderDate >= fromUtc.Value);
        if (toUtc.HasValue)
            salesQuery = salesQuery.Where(x => x.OrderDate <= toUtc.Value);
        var sales = await salesQuery.ToListAsync(ct);

        var returnsQuery = _db.ReturnOrders
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.Status == "completed")
            .Include(x => x.Items.Where(item => !item.IsVoid))
                .ThenInclude(x => x.SalesOrderItem)
            .Include(x => x.SalesOrder)
            .AsQueryable();
        if (fromUtc.HasValue)
            returnsQuery = returnsQuery.Where(x => x.ReturnDate >= fromUtc.Value);
        if (toUtc.HasValue)
            returnsQuery = returnsQuery.Where(x => x.ReturnDate <= toUtc.Value);
        var returns = await returnsQuery.ToListAsync(ct);

        var purchaseQuery = _db.PurchaseOrders
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.Status == "received")
            .Include(x => x.Supplier)
            .Include(x => x.Items.Where(item => !item.IsVoid))
                .ThenInclude(x => x.Material)
            .AsQueryable();
        if (fromUtc.HasValue)
            purchaseQuery = purchaseQuery.Where(x => x.OrderDate >= fromUtc.Value);
        if (toUtc.HasValue)
            purchaseQuery = purchaseQuery.Where(x => x.OrderDate <= toUtc.Value);
        var purchasesInPeriod = await purchaseQuery.ToListAsync(ct);

        var expenseQuery = _db.OperatingExpenses
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.Status == "posted")
            .Include(x => x.Category)
            .AsQueryable();
        if (fromUtc.HasValue)
            expenseQuery = expenseQuery.Where(x => x.Date >= fromUtc.Value);
        if (toUtc.HasValue)
            expenseQuery = expenseQuery.Where(x => x.Date <= toUtc.Value);
        var expenses = await expenseQuery.ToListAsync(ct);

        var usageQuery = _db.ProductionMaterialConsumptions
            .AsNoTracking()
            .Where(x => !x.IsVoid && !x.ProductionOrder.IsVoid && x.ProductionOrder.Status == "completed")
            .Include(x => x.PurchaseOrderItem)
                .ThenInclude(x => x.Material)
            .Include(x => x.ProductionOrder)
            .AsQueryable();
        if (fromUtc.HasValue)
            usageQuery = usageQuery.Where(x => x.ProductionOrder.ProductionDate >= fromUtc.Value);
        if (toUtc.HasValue)
            usageQuery = usageQuery.Where(x => x.ProductionOrder.ProductionDate <= toUtc.Value);
        var usage = await usageQuery.ToListAsync(ct);

        var scrapQuery = _db.ProductionOrders
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.Status == "completed")
            .AsQueryable();
        if (fromUtc.HasValue)
            scrapQuery = scrapQuery.Where(x => x.ProductionDate >= fromUtc.Value);
        if (toUtc.HasValue)
            scrapQuery = scrapQuery.Where(x => x.ProductionDate <= toUtc.Value);
        var scrapCostTotal = await scrapQuery.SumAsync(x => x.ScrapCostCents, ct);

        var currentLots = await _db.PurchaseOrderItems
            .AsNoTracking()
            .Where(x =>
                !x.IsVoid &&
                x.QuantityRemaining > 0 &&
                !x.PurchaseOrder.IsVoid &&
                x.PurchaseOrder.Status == "received")
            .Include(x => x.Material)
            .Include(x => x.PurchaseOrder)
                .ThenInclude(x => x.Supplier)
            .OrderBy(x => x.PurchaseOrder.OrderDate)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);
        var finishedGoodsRows = await _db.FinishedGoodsInventories
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .Include(x => x.Product)
            .OrderBy(x => x.Product.Name)
            .ToListAsync(ct);
        var finishedGoodsLots = await _db.FinishedGoodsLots
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.QuantityRemaining > 0)
            .ToListAsync(ct);
        var finishedGoodsLotsByProduct = finishedGoodsLots
            .GroupBy(x => x.ProductId)
            .ToDictionary(
                group => group.Key,
                group => (
                    Quantity: group.Sum(x => x.QuantityRemaining),
                    ValueCents: group.Sum(x => (long)x.QuantityRemaining * x.UnitCostCents)));
        var materials = await _db.Materials
            .AsNoTracking()
            .Where(x => !x.IsVoid && x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(ct);
        var productMargins = await _products.GetProductsAsync(ct);

        var listedRevenue = sales.Sum(sale =>
            ToBase(sale.OrderItems.Sum(item => checked(item.ListedPriceCents * item.Quantity)), sale.ExchangeRateToBase));
        var refunds = returns.Sum(row => ToBase(row.RefundAmountCents, row.ExchangeRateToBase));
        var grossChannelFees = sales.Sum(sale => ToBase(sale.ChannelFeeCents, sale.ExchangeRateToBase));
        // Channel fees are non-refundable on the platform side, but the P&L must still
        // release the fee expense tied to units that were refunded — otherwise fees stay
        // fully charged against revenue that's since been reversed.
        var feesReversed = returns.Sum(row =>
            ToBase(row.Items.Sum(item => item.FeeReversedCents), row.ExchangeRateToBase));
        var channelFees = grossChannelFees - feesReversed;
        var saleCogs = sales.Sum(sale =>
            sale.OrderItems.Sum(item => checked(item.UnitCogsCents * item.Quantity)));
        var cogsReversed = returns.Sum(row => row.Items.Sum(item => item.CogsReversedCents));
        var cogs = saleCogs - cogsReversed;
        // AmountCents is treated as gross (VAT inclusive). P&L uses net OpEx;
        // VAT paid is reported only in the VAT summary to avoid double-counting.
        var operatingExpenseTotal = expenses.Sum(x => x.BaseAmountCents - x.BaseVatAmountCents);
        var revenue = listedRevenue - refunds;
        var netRevenue = revenue - channelFees;
        var grossProfit = netRevenue - cogs;
        var pnl = new ProfitAndLossDto(
            listedRevenue,
            refunds,
            revenue,
            channelFees,
            netRevenue,
            cogs,
            grossProfit,
            scrapCostTotal,
            operatingExpenseTotal,
            grossProfit - scrapCostTotal - operatingExpenseTotal);

        var outputVat = sales.Sum(sale =>
            ToBase(sale.OrderItems.Sum(item => item.VatAmountCents), sale.ExchangeRateToBase));
        var outputVatReversed = returns.Sum(row =>
            ToBase(row.Items.Sum(item => item.VatReversedCents), row.ExchangeRateToBase));
        var purchaseVat = purchasesInPeriod.Sum(order => order.Items.Sum(item => item.BaseVatAmountCents));
        var expenseVat = expenses.Sum(x => x.BaseVatAmountCents);
        var netOutputVat = outputVat - outputVatReversed;
        var totalInputVat = purchaseVat + expenseVat;
        var vat = new VatSummaryDto(
            outputVat,
            outputVatReversed,
            netOutputVat,
            purchaseVat,
            expenseVat,
            totalInputVat,
            netOutputVat - totalInputVat);

        var rawLots = currentLots.Select(x => new RawMaterialLotReportDto(
            x.Id,
            x.PurchaseOrderId,
            x.MaterialId,
            x.Material.Name,
            x.Material.Unit,
            x.PurchaseOrder.Supplier.Name,
            x.PurchaseOrder.OrderDate,
            x.QuantityPurchased,
            x.QuantityRemaining,
            x.BaseUnitPriceCents,
            RoundToCents(x.QuantityRemaining * x.BaseUnitPriceCents))).ToList();
        // Value off the actual remaining FIFO lots where they exist — more precise than the
        // pooled average, since lots carry each production run's true locked-in cost.
        var finishedGoods = finishedGoodsRows.Select(x =>
        {
            if (finishedGoodsLotsByProduct.TryGetValue(x.ProductId, out var lotAgg) && lotAgg.Quantity > 0)
            {
                var lotAverageCost = RoundToCents((decimal)lotAgg.ValueCents / lotAgg.Quantity);
                return new FinishedGoodsStockReportDto(
                    x.ProductId, x.Product.Name, x.Product.ProductCode,
                    lotAgg.Quantity, lotAverageCost, lotAgg.ValueCents);
            }
            return new FinishedGoodsStockReportDto(
                x.ProductId, x.Product.Name, x.Product.ProductCode,
                x.QuantityOnHand, x.AverageUnitCostCents, checked(x.AverageUnitCostCents * x.QuantityOnHand));
        }).ToList();
        var quantityByMaterial = currentLots
            .GroupBy(x => x.MaterialId)
            .ToDictionary(group => group.Key, group => group.Sum(x => x.QuantityRemaining));
        var lowStock = materials
            .Where(x => quantityByMaterial.GetValueOrDefault(x.Id) <= x.ReorderThreshold)
            .Select(x => new LowMaterialStockAlertDto(
                x.Id,
                x.Name,
                x.Unit,
                quantityByMaterial.GetValueOrDefault(x.Id),
                x.ReorderThreshold))
            .ToList();
        // What you'd take in if every unit currently in finished-goods stock sold at its
        // product's current listed price — a "potential revenue" figure distinct from the
        // cost-based valuation above, using the same base-currency price the margin/alert
        // system already resolves per product.
        var sellingPriceBaseByProduct = productMargins
            .Where(x => x.Margin.SellingPriceBaseCents.HasValue)
            .ToDictionary(x => x.Id, x => x.Margin.SellingPriceBaseCents!.Value);
        var finishedGoodsPotentialRevenue = finishedGoods.Sum(x =>
            sellingPriceBaseByProduct.TryGetValue(x.ProductId, out var sellingBase)
                ? checked(sellingBase * x.QuantityOnHand)
                : 0);

        var valuation = new InventoryValuationDto(
            rawLots.Sum(x => x.ValueCents),
            finishedGoods.Sum(x => x.ValueCents),
            rawLots.Sum(x => x.ValueCents) + finishedGoods.Sum(x => x.ValueCents),
            finishedGoodsPotentialRevenue);

        var priceHistory = purchasesInPeriod
            .SelectMany(order => order.Items.Select(item => new MaterialPricePointDto(
                item.MaterialId,
                item.Material.Name,
                order.SupplierId,
                order.Supplier.Name,
                order.OrderDate,
                item.BaseUnitPriceCents)))
            .OrderBy(x => x.OrderDate)
            .ToList();
        var materialUsage = usage
            .GroupBy(x => new { x.PurchaseOrderItem.MaterialId, x.PurchaseOrderItem.Material.Name, x.PurchaseOrderItem.Material.Unit })
            .Select(group => new MaterialUsageSummaryDto(
                group.Key.MaterialId,
                group.Key.Name,
                group.Key.Unit,
                group.Sum(x => x.QuantityUsed),
                group.Sum(x => x.TotalCostCents)))
            .OrderBy(x => x.MaterialName)
            .ToList();

        var returnedByProduct = returns
            .SelectMany(row => row.Items.Select(item => new { Return = row, Item = item }))
            .Where(x => x.Item.SalesOrderItem.ProductId.HasValue)
            .GroupBy(x => x.Item.SalesOrderItem.ProductId!.Value)
            .ToDictionary(
                group => group.Key,
                group => new
                {
                    Refund = group.Sum(x => ToBase(x.Item.RefundAmountCents, x.Return.ExchangeRateToBase)),
                    Cogs = group.Sum(x => x.Item.CogsReversedCents),
                    Fee = group.Sum(x => ToBase(x.Item.FeeReversedCents, x.Return.ExchangeRateToBase)),
                });
        var saleItemsByProduct = sales
            .SelectMany(sale => sale.OrderItems.Select(item => new { Sale = sale, Item = item }))
            .Where(x => x.Item.ProductId.HasValue)
            .GroupBy(x => x.Item.ProductId!.Value)
            .ToList();
        var cogsByProduct = saleItemsByProduct
            .Select(group =>
            {
                returnedByProduct.TryGetValue(group.Key, out var returned);
                return new ProductCogsSummaryDto(
                    group.Key,
                    group.First().Item.ProductName,
                    group.Sum(x => x.Item.Quantity),
                    group.Sum(x => checked(x.Item.UnitCogsCents * x.Item.Quantity)) - (returned?.Cogs ?? 0));
            })
            .OrderByDescending(x => x.CogsCents)
            .ToList();

        var returnBySale = returns
            .GroupBy(x => x.SalesOrderId)
            .ToDictionary(
                group => group.Key,
                group => new
                {
                    Refund = group.Sum(x => ToBase(x.RefundAmountCents, x.ExchangeRateToBase)),
                    Cogs = group.Sum(x => x.Items.Sum(item => item.CogsReversedCents)),
                    Fee = group.Sum(x => ToBase(x.Items.Sum(item => item.FeeReversedCents), x.ExchangeRateToBase)),
                });
        var channelRows = sales
            .GroupBy(x => new { x.ChannelId, Name = x.Channel?.Name ?? "Own store" })
            .Select(group =>
            {
                var gross = group.Sum(sale =>
                    ToBase(sale.OrderItems.Sum(item => checked(item.ListedPriceCents * item.Quantity)), sale.ExchangeRateToBase));
                var fees = group.Sum(sale =>
                    ToBase(sale.ChannelFeeCents, sale.ExchangeRateToBase) -
                    (returnBySale.GetValueOrDefault(sale.Id)?.Fee ?? 0));
                var channelRefunds = group.Sum(sale => returnBySale.GetValueOrDefault(sale.Id)?.Refund ?? 0);
                var channelCogs = group.Sum(sale =>
                    sale.OrderItems.Sum(item => checked(item.UnitCogsCents * item.Quantity)) -
                    (returnBySale.GetValueOrDefault(sale.Id)?.Cogs ?? 0));
                var channelNet = gross - channelRefunds - fees;
                return new SalesChannelSummaryDto(
                    group.Key.ChannelId,
                    group.Key.Name,
                    group.Count(),
                    gross,
                    channelRefunds,
                    fees,
                    channelNet,
                    channelCogs,
                    channelNet - channelCogs);
            })
            .OrderByDescending(x => x.NetRevenueCents)
            .ToList();

        var customerRows = sales
            .GroupBy(x => new { x.CustomerId, Name = $"{x.Customer.FirstName} {x.Customer.LastName}".Trim() })
            .Select(group =>
            {
                var gross = group.Sum(sale =>
                    ToBase(sale.OrderItems.Sum(item => checked(item.ListedPriceCents * item.Quantity)), sale.ExchangeRateToBase));
                var fees = group.Sum(sale =>
                    ToBase(sale.ChannelFeeCents, sale.ExchangeRateToBase) -
                    (returnBySale.GetValueOrDefault(sale.Id)?.Fee ?? 0));
                var customerRefunds = group.Sum(sale => returnBySale.GetValueOrDefault(sale.Id)?.Refund ?? 0);
                return new SalesCustomerSummaryDto(
                    group.Key.CustomerId,
                    group.Key.Name,
                    group.Count(),
                    gross,
                    gross - customerRefunds - fees);
            })
            .OrderByDescending(x => x.NetRevenueCents)
            .ToList();

        var productRows = saleItemsByProduct
            .Select(group =>
            {
                returnedByProduct.TryGetValue(group.Key, out var returned);
                var gross = group.Sum(x =>
                    ToBase(checked(x.Item.ListedPriceCents * x.Item.Quantity), x.Sale.ExchangeRateToBase));
                var fees = group.Sum(x => ToBase(x.Item.ChannelFeeShareCents, x.Sale.ExchangeRateToBase)) -
                    (returned?.Fee ?? 0);
                var productRefunds = returned?.Refund ?? 0;
                var productCogs = group.Sum(x => checked(x.Item.UnitCogsCents * x.Item.Quantity)) - (returned?.Cogs ?? 0);
                var productNet = gross - fees - productRefunds;
                return new SalesProductSummaryDto(
                    group.Key,
                    group.First().Item.ProductName,
                    group.Sum(x => x.Item.Quantity),
                    gross,
                    productNet,
                    productCogs,
                    productNet - productCogs);
            })
            .OrderByDescending(x => x.NetRevenueCents)
            .ToList();
        var expenseRows = expenses
            .GroupBy(x => new { x.CategoryId, x.Category.Name })
            .Select(group => new ExpenseCategorySummaryDto(
                group.Key.CategoryId,
                group.Key.Name,
                group.Count(),
                group.Sum(x => x.BaseAmountCents),
                group.Sum(x => x.BaseVatAmountCents)))
            .OrderByDescending(x => x.AmountCents)
            .ToList();

        var unitsSold = sales.Sum(x => x.OrderItems.Sum(item => item.Quantity));
        var unitsReturned = returns.Sum(x => x.Items.Sum(item => item.Quantity));
        var returnSummary = new ReturnSummaryDto(
            returns.Count,
            unitsReturned,
            refunds,
            returns.Where(x => x.Resolution == "restock").Sum(x => x.Items.Sum(item => item.Quantity)),
            returns.Where(x => x.Resolution == "write_off").Sum(x => x.Items.Sum(item => item.Quantity)),
            unitsSold == 0
                ? 0m
                : decimal.Round(unitsReturned * 100m / unitsSold, 2, MidpointRounding.AwayFromZero));

        return new AccountingDashboardV3Dto(
            fromUtc,
            toUtc,
            baseCurrency,
            pnl,
            vat,
            valuation,
            returnSummary,
            productMargins,
            lowStock,
            rawLots,
            finishedGoods,
            priceHistory,
            materialUsage,
            cogsByProduct,
            channelRows,
            customerRows,
            productRows,
            expenseRows);
    }

    private static long ToBase(long amountCents, decimal rate) =>
        RoundToCents(amountCents * rate);

    private static long RoundToCents(decimal value) =>
        checked((long)decimal.Round(value, 0, MidpointRounding.AwayFromZero));

    private static DateTime EnsureUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
}
