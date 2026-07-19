namespace YarneAPIBack.Accounting.DTOs;

public sealed record ProductBomItemDto(
    int Id,
    int MaterialId,
    string MaterialName,
    string MaterialUnit,
    decimal QuantityRequired,
    long? LatestBaseUnitPriceCents,
    long? CurrentLineCostCents);

public sealed record ProductBomDto(
    int Id,
    long LabourCostCents,
    string CurrencyCode,
    IReadOnlyList<ProductBomItemDto> Items);

public sealed record ProductMarginDto(
    bool CostAvailable,
    long? CurrentBomCostCents,
    long? SellingPriceBaseCents,
    decimal? CurrentMarginPct,
    decimal ThresholdPct,
    bool IsFlagged,
    IReadOnlyList<string> MissingMaterialNames);

public sealed record AccountingProductDto(
    int Id,
    string Name,
    string Sku,
    string? Description,
    long SellingPriceCents,
    string SellingCurrencyCode,
    decimal MarginThresholdPct,
    ProductBomDto? Bom,
    ProductMarginDto Margin);

public sealed class UpdateProductAccountingRequest
{
    public long SellingPriceCents { get; set; }
    public string SellingCurrencyCode { get; set; } = "UAH";
    public decimal MarginThresholdPct { get; set; } = 60m;
}

public sealed class SaveProductBomItemRequest
{
    public int MaterialId { get; set; }
    public decimal QuantityRequired { get; set; }
}

public sealed class SaveProductBomRequest
{
    public long LabourCostCents { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public List<SaveProductBomItemRequest> Items { get; set; } = [];
}
