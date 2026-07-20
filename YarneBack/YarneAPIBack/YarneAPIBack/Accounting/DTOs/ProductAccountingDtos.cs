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

public sealed record ProductSaleComponentDto(
    int Id,
    int ComponentProductId,
    string ComponentProductName,
    string ComponentProductSku,
    int Quantity,
    string Condition,
    long ComponentSellingPriceCents,
    string ComponentSellingCurrencyCode,
    int? ColorId,
    string? ColorName,
    string? ColorHex);

public sealed record AccountingProductDto(
    int Id,
    string Name,
    string Sku,
    string? Description,
    long SellingPriceCents,
    string SellingCurrencyCode,
    decimal MarginThresholdPct,
    bool IsInternalComponent,
    ProductBomDto? Bom,
    ProductMarginDto Margin,
    IReadOnlyList<ProductSaleComponentDto> SaleComponents);

public sealed class UpdateProductAccountingRequest
{
    public long SellingPriceCents { get; set; }
    public string SellingCurrencyCode { get; set; } = "UAH";
    public decimal MarginThresholdPct { get; set; } = 60m;
}

public sealed class SetInternalComponentRequest
{
    public bool IsInternalComponent { get; set; }
}

public sealed class SaveProductSaleComponentItemRequest
{
    public int ComponentProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public string Condition { get; set; } = "with_lace";

    /// <summary>Required when Condition == "with_lace"; must be null when Condition == "always".</summary>
    public int? ColorId { get; set; }
}

public sealed class SaveProductSaleComponentsRequest
{
    public List<SaveProductSaleComponentItemRequest> Components { get; set; } = [];
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
