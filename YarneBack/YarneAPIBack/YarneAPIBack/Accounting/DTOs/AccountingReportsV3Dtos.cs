namespace YarneAPIBack.Accounting.DTOs;

public sealed record ProfitAndLossDto(
    long ListedRevenueCents,
    long RefundsCents,
    long RevenueCents,
    long ChannelFeesCents,
    long NetRevenueCents,
    long CogsCents,
    long GrossProfitCents,
    long ScrapCostCents,
    long OperatingExpensesCents,
    long NetProfitCents);

public sealed record VatSummaryDto(
    long OutputVatCollectedCents,
    long OutputVatReversedCents,
    long NetOutputVatCents,
    long PurchaseInputVatCents,
    long ExpenseInputVatCents,
    long TotalInputVatCents,
    long VatPayableCents);

public sealed record RawMaterialLotReportDto(
    int PurchaseOrderItemId,
    int PurchaseOrderId,
    int MaterialId,
    string MaterialName,
    string Unit,
    string SupplierName,
    DateTime OrderDate,
    decimal QuantityPurchased,
    decimal QuantityRemaining,
    long BaseUnitPriceCents,
    long ValueCents);

public sealed record FinishedGoodsStockReportDto(
    int ProductId,
    string ProductName,
    string Sku,
    int QuantityOnHand,
    long AverageUnitCostCents,
    long ValueCents);

public sealed record LowMaterialStockAlertDto(
    int MaterialId,
    string MaterialName,
    string Unit,
    decimal QuantityOnHand,
    decimal ReorderThreshold);

public sealed record MaterialPricePointDto(
    int MaterialId,
    string MaterialName,
    int SupplierId,
    string SupplierName,
    DateTime OrderDate,
    long BaseUnitPriceCents);

public sealed record MaterialUsageSummaryDto(
    int MaterialId,
    string MaterialName,
    string Unit,
    decimal QuantityUsed,
    long CostCents);

public sealed record ProductCogsSummaryDto(
    int ProductId,
    string ProductName,
    int QuantitySold,
    long CogsCents);

public sealed record ReturnSummaryDto(
    int CompletedReturns,
    int UnitsReturned,
    long RefundTotalCents,
    int RestockedUnits,
    int WrittenOffUnits,
    decimal ReturnRatePct);

public sealed record SalesChannelSummaryDto(
    int? ChannelId,
    string ChannelName,
    int OrderCount,
    long ListedRevenueCents,
    long RefundsCents,
    long ChannelFeesCents,
    long NetRevenueCents,
    long CogsCents,
    long MarginCents);

public sealed record SalesCustomerSummaryDto(
    int CustomerId,
    string CustomerName,
    int OrderCount,
    long ListedRevenueCents,
    long NetRevenueCents);

public sealed record SalesProductSummaryDto(
    int ProductId,
    string ProductName,
    int QuantitySold,
    long ListedRevenueCents,
    long NetRevenueCents,
    long CogsCents,
    long MarginCents);

public sealed record ExpenseCategorySummaryDto(
    int CategoryId,
    string CategoryName,
    int ExpenseCount,
    long AmountCents,
    long VatAmountCents);

public sealed record InventoryValuationDto(
    long RawMaterialValueCents,
    long FinishedGoodsValueCents,
    long TotalValueCents,
    long FinishedGoodsPotentialRevenueCents);

public sealed record AccountingDashboardV3Dto(
    DateTime? DateFrom,
    DateTime? DateTo,
    string BaseCurrencyCode,
    ProfitAndLossDto ProfitAndLoss,
    VatSummaryDto Vat,
    InventoryValuationDto InventoryValuation,
    ReturnSummaryDto Returns,
    IReadOnlyList<AccountingProductDto> ProductMargins,
    IReadOnlyList<LowMaterialStockAlertDto> LowStockAlerts,
    IReadOnlyList<RawMaterialLotReportDto> RawMaterialLots,
    IReadOnlyList<FinishedGoodsStockReportDto> FinishedGoods,
    IReadOnlyList<MaterialPricePointDto> MaterialPriceHistory,
    IReadOnlyList<MaterialUsageSummaryDto> MaterialUsage,
    IReadOnlyList<ProductCogsSummaryDto> CogsByProduct,
    IReadOnlyList<SalesChannelSummaryDto> SalesByChannel,
    IReadOnlyList<SalesCustomerSummaryDto> SalesByCustomer,
    IReadOnlyList<SalesProductSummaryDto> SalesByProduct,
    IReadOnlyList<ExpenseCategorySummaryDto> ExpensesByCategory);
