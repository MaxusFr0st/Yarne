using YarneAPIBack.Models;

namespace YarneAPIBack.Accounting.Models;

public class AccountingCurrency
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Symbol { get; set; } = null!;
    public int MinorUnitDigits { get; set; } = 2;
    public bool IsBase { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CurrencyExchangeRate
{
    public int Id { get; set; }
    public string FromCurrencyCode { get; set; } = null!;
    public string ToCurrencyCode { get; set; } = null!;
    public decimal Rate { get; set; }
    public DateTime EffectiveAt { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public AccountingCurrency FromCurrency { get; set; } = null!;
    public AccountingCurrency ToCurrency { get; set; } = null!;
}

public class Supplier
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? ContactInfo { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}

public class PurchaseOrder
{
    public int Id { get; set; }
    public int SupplierId { get; set; }
    public DateTime OrderDate { get; set; }
    public string? InvoiceRef { get; set; }
    public string Status { get; set; } = "draft";
    public string? ReceiptUrl { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public decimal ExchangeRateToBase { get; set; } = 1m;
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public AccountingCurrency Currency { get; set; } = null!;
    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
}

public class PurchaseOrderItem
{
    public int Id { get; set; }
    public int PurchaseOrderId { get; set; }
    public int MaterialId { get; set; }
    public decimal QuantityPurchased { get; set; }
    public long UnitPriceCents { get; set; }
    public long TotalCostCents { get; set; }
    public decimal QuantityRemaining { get; set; }
    /// <summary>
    /// Roll/discrete-item tracking snapshot (only set when the material was
    /// roll-tracked at purchase time). Both null = bulk lot (today's
    /// behaviour); both set = ItemCount * LengthPerItem == QuantityPurchased
    /// (enforced in ProcurementService, within tolerance). Never read live
    /// from Material.DefaultLengthPerItem — roll size can vary per purchase.
    /// </summary>
    public int? ItemCount { get; set; }
    public decimal? LengthPerItem { get; set; }
    /// <summary>
    /// Price per roll in cents, as written on the supplier invoice, when the line was
    /// entered that way (roll-tracked materials). When set, TotalCostCents is computed
    /// exactly as ItemCount * RollPriceCents rather than QuantityPurchased * UnitPriceCents —
    /// the latter would compound rounding error from UnitPriceCents' whole-cent-per-base-unit
    /// precision across a large quantity (e.g. 6 rolls x 120m loses cents vs. the true total).
    /// UnitPriceCents is still derived and stored for per-unit FIFO/valuation purposes.
    /// </summary>
    public long? RollPriceCents { get; set; }
    public long VatAmountCents { get; set; }
    public long BaseUnitPriceCents { get; set; }
    public long BaseTotalCostCents { get; set; }
    public long BaseVatAmountCents { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public Material Material { get; set; } = null!;
    public ICollection<ProductionMaterialConsumption> Consumptions { get; set; } =
        new List<ProductionMaterialConsumption>();
}

public class ProductBom
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public long LabourCostCents { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Product Product { get; set; } = null!;
    public AccountingCurrency Currency { get; set; } = null!;
    public ICollection<ProductBomItem> Items { get; set; } = new List<ProductBomItem>();
}

public class ProductBomItem
{
    public int Id { get; set; }
    public int ProductBomId { get; set; }
    public int MaterialId { get; set; }
    public decimal QuantityRequired { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ProductBom ProductBom { get; set; } = null!;
    public Material Material { get; set; } = null!;
}

public class ProductionOrder
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int QuantityProduced { get; set; }
    public int QuantityRejected { get; set; }
    public DateTime ProductionDate { get; set; }
    public long TotalMaterialCostCents { get; set; }
    public long TotalLabourCostCents { get; set; }
    public long TotalCogsCents { get; set; }
    public long CapitalizedCogsCents { get; set; }
    public long ScrapCostCents { get; set; }
    public string Status { get; set; } = "draft";
    public string? Notes { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Product Product { get; set; } = null!;
    public ICollection<ProductionMaterialConsumption> MaterialConsumptions { get; set; } =
        new List<ProductionMaterialConsumption>();
    // One production run can yield several lots when FIFO crosses a raw-material lot
    // boundary mid-run: each cost step becomes its own FinishedGoodsLot.
    public ICollection<FinishedGoodsLot> FinishedGoodsLots { get; set; } =
        new List<FinishedGoodsLot>();
}

public class ProductionMaterialConsumption
{
    public int Id { get; set; }
    public int ProductionOrderId { get; set; }
    public int PurchaseOrderItemId { get; set; }
    public decimal QuantityUsed { get; set; }
    public long UnitCostAtUseCents { get; set; }
    public long TotalCostCents { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ProductionOrder ProductionOrder { get; set; } = null!;
    public PurchaseOrderItem PurchaseOrderItem { get; set; } = null!;
}

public class FinishedGoodsInventory
{
    public int ProductId { get; set; }
    public int QuantityOnHand { get; set; }
    public long AverageUnitCostCents { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Product Product { get; set; } = null!;
}

/// <summary>
/// One row per contiguous same-cost slice of a production run's accepted output — the
/// finished-goods equivalent of a PurchaseOrderItem lot. A run whose material FIFO crossed
/// a raw-material lot boundary mid-run yields several lots (e.g. 2 units at cost X, then
/// 1 unit at cost Y). Sales consume these FIFO (oldest first) so COGS reflects the true
/// cost of the batch actually sold, not a pooled average across production runs.
/// </summary>
public class FinishedGoodsLot
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int ProductionOrderId { get; set; }
    public int QuantityProduced { get; set; }
    public int QuantityRemaining { get; set; }
    public long UnitCostCents { get; set; }
    /// <summary>
    /// Optional stock-taking label ("Yellow, M, with lace"). Never affects BOM lookup,
    /// material consumption, or costing — the BOM stays product-level. A lot is
    /// variant-tagged iff both ColorId and SizeId are set.
    /// </summary>
    public int? ColorId { get; set; }
    public int? SizeId { get; set; }
    public bool Lace { get; set; }
    /// <summary>
    /// How many of this lot's units have been pushed into the storefront's per-variant
    /// stock (ProductVariantStock) via "use stock". Separate from QuantityRemaining, which
    /// keeps meaning "available for accounting Sales FIFO consumption". A lot's
    /// still-applicable quantity is max(0, QuantityRemaining - AppliedToStorefrontQuantity).
    /// </summary>
    public int AppliedToStorefrontQuantity { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Product Product { get; set; } = null!;
    public ProductionOrder ProductionOrder { get; set; } = null!;
    public Color? Color { get; set; }
    public Size? Size { get; set; }
    public ICollection<SalesFinishedGoodsConsumption> Consumptions { get; set; } =
        new List<SalesFinishedGoodsConsumption>();
}

/// <summary>
/// Records exactly which FinishedGoodsLot(s) a sale line drew from, FIFO — the finished-goods
/// mirror of ProductionMaterialConsumption. Lets a return trace back through the FG lot to the
/// production run that made it, and from there to the raw-material lots it consumed.
/// </summary>
public class SalesFinishedGoodsConsumption
{
    public int Id { get; set; }
    public int SalesOrderItemId { get; set; }
    public int FinishedGoodsLotId { get; set; }
    public int Quantity { get; set; }
    public long UnitCostAtSaleCents { get; set; }
    public long TotalCostCents { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public OrderItem SalesOrderItem { get; set; } = null!;
    public FinishedGoodsLot FinishedGoodsLot { get; set; } = null!;
}

public class SalesChannel
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string FeeType { get; set; } = "none";
    public decimal FeePercentage { get; set; }
    public long FeeFlatCents { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public AccountingCurrency Currency { get; set; } = null!;
    public ICollection<Order> SalesOrders { get; set; } = new List<Order>();
}

public class ReturnOrder
{
    public int Id { get; set; }
    public int SalesOrderId { get; set; }
    public DateTime ReturnDate { get; set; }
    public string Reason { get; set; } = "customer_request";
    public string Resolution { get; set; } = "restock";
    public long RefundAmountCents { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public decimal ExchangeRateToBase { get; set; } = 1m;
    public string Status { get; set; } = "draft";
    public string? Notes { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Order SalesOrder { get; set; } = null!;
    public AccountingCurrency Currency { get; set; } = null!;
    public ICollection<ReturnOrderItem> Items { get; set; } = new List<ReturnOrderItem>();
}

public class ReturnOrderItem
{
    public int Id { get; set; }
    public int ReturnOrderId { get; set; }
    public int SalesOrderItemId { get; set; }
    public int Quantity { get; set; }
    public long RefundAmountCents { get; set; }
    public long VatReversedCents { get; set; }
    public long CogsReversedCents { get; set; }
    public long FeeReversedCents { get; set; }
    public long MaterialsReclaimedCents { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ReturnOrder ReturnOrder { get; set; } = null!;
    public OrderItem SalesOrderItem { get; set; } = null!;
}

public class OperatingExpenseCategory
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<OperatingExpense> Expenses { get; set; } = new List<OperatingExpense>();
}

public class OperatingExpense
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public DateTime Date { get; set; }
    public long AmountCents { get; set; }
    public long VatAmountCents { get; set; }
    public long BaseAmountCents { get; set; }
    public long BaseVatAmountCents { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public decimal ExchangeRateToBase { get; set; } = 1m;
    public string? Vendor { get; set; }
    public string? Description { get; set; }
    public string? PaymentMethod { get; set; }
    public string? ReceiptUrl { get; set; }
    public string Status { get; set; } = "posted";
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public OperatingExpenseCategory Category { get; set; } = null!;
    public AccountingCurrency Currency { get; set; } = null!;
}
