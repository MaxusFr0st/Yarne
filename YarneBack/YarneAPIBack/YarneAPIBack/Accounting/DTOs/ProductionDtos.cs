namespace YarneAPIBack.Accounting.DTOs;

public sealed record ProductionConsumptionDto(
    int Id,
    int PurchaseOrderItemId,
    int MaterialId,
    string MaterialName,
    decimal QuantityUsed,
    long UnitCostAtUseCents,
    long TotalCostCents);

public sealed record ProductionLotDto(
    int Id,
    int QuantityProduced,
    int QuantityRemaining,
    long UnitCostCents,
    int? ColorId,
    string? ColorName,
    int? SizeId,
    string? SizeName,
    bool Lace);

public sealed record ProductionOrderDto(
    int Id,
    int ProductId,
    string ProductName,
    string ProductSku,
    int QuantityProduced,
    int QuantityRejected,
    int QuantityAddedToStock,
    DateTime ProductionDate,
    long TotalMaterialCostCents,
    long TotalLabourCostCents,
    long TotalCogsCents,
    long ScrapCostCents,
    string Status,
    string? Notes,
    DateTime CreatedAt,
    IReadOnlyList<ProductionConsumptionDto> MaterialConsumptions,
    IReadOnlyList<ProductionLotDto> Lots);

public sealed class CreateProductionOrderRequest
{
    public int ProductId { get; set; }
    public int QuantityProduced { get; set; }
    public int QuantityRejected { get; set; }
    public DateTime ProductionDate { get; set; }
    public string? Notes { get; set; }
    /// <summary>Optional stock-taking label only — never affects BOM or costing.</summary>
    public int? ColorId { get; set; }
    public int? SizeId { get; set; }
    public bool Lace { get; set; }
}

// ─── Finished-goods stock (per-product lot breakdown with margins) ───────────

public sealed record FinishedGoodsStockLotDto(
    int LotId,
    int ProductionOrderId,
    DateTime ProductionDate,
    int QuantityProduced,
    int QuantityRemaining,
    int AppliedToStorefrontQuantity,
    long UnitCostCents,
    int? ColorId,
    string? ColorName,
    int? SizeId,
    string? SizeName,
    bool Lace,
    decimal? MarginPct);

public sealed record FinishedGoodsStockProductDto(
    int ProductId,
    string ProductName,
    string ProductSku,
    long SellingPriceCents,
    string SellingCurrencyCode,
    int TotalQuantityRemaining,
    IReadOnlyList<FinishedGoodsStockLotDto> Lots);

// ─── Applying tagged produced stock onto a storefront variant ────────────────

public sealed record VariantProducedAvailabilityDto(
    int ColorId,
    int SizeId,
    bool Lace,
    int AvailableQuantity);

public sealed class ApplyVariantStockRequest
{
    public int ProductId { get; set; }
    public int ColorId { get; set; }
    public int SizeId { get; set; }
    public bool Lace { get; set; }
    public int Quantity { get; set; }
}

public sealed record ApplyVariantStockResultDto(
    int VariantQuantityInStock,
    int RemainingAvailableQuantity);
