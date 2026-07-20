namespace YarneAPIBack.Accounting.DTOs;

public sealed record CurrencyDto(
    string Code,
    string Name,
    string Symbol,
    bool IsBase,
    bool IsActive);

public sealed record ExchangeRateDto(
    int Id,
    string FromCurrencyCode,
    string ToCurrencyCode,
    decimal Rate,
    DateTime EffectiveAt);

public sealed class SetExchangeRateRequest
{
    public string FromCurrencyCode { get; set; } = "EUR";
    public string ToCurrencyCode { get; set; } = "UAH";
    public decimal Rate { get; set; }
    public DateTime EffectiveAt { get; set; }
}

public sealed record SupplierDto(
    int Id,
    string Name,
    string? ContactInfo,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed class SaveSupplierRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ContactInfo { get; set; }
}

public sealed record PurchaseOrderItemDto(
    int Id,
    int MaterialId,
    string MaterialName,
    string MaterialUnit,
    decimal QuantityPurchased,
    decimal QuantityRemaining,
    long UnitPriceCents,
    long TotalCostCents,
    long VatAmountCents,
    long BaseUnitPriceCents,
    long BaseTotalCostCents,
    long BaseVatAmountCents,
    int? ItemCount,
    decimal? LengthPerItem,
    long? RollPriceCents,
    int? WholeItemsRemaining,
    decimal? PartialRemainder);

public sealed record PurchaseOrderDto(
    int Id,
    int SupplierId,
    string SupplierName,
    DateTime OrderDate,
    string? InvoiceRef,
    string Status,
    string? ReceiptUrl,
    string CurrencyCode,
    decimal ExchangeRateToBase,
    long TotalCostCents,
    long VatAmountCents,
    long BaseTotalCostCents,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<PurchaseOrderItemDto> Items);

public sealed class SavePurchaseOrderItemRequest
{
    public int MaterialId { get; set; }
    public decimal QuantityPurchased { get; set; }
    public long UnitPriceCents { get; set; }
    public long VatAmountCents { get; set; }
    public int? ItemCount { get; set; }
    public decimal? LengthPerItem { get; set; }
    public long? RollPriceCents { get; set; }
}

public sealed class SavePurchaseOrderRequest
{
    public int SupplierId { get; set; }
    public DateTime OrderDate { get; set; }
    public string? InvoiceRef { get; set; }
    public string Status { get; set; } = "draft";
    public string? ReceiptUrl { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public decimal? ExchangeRateToBase { get; set; }
    public List<SavePurchaseOrderItemRequest> Items { get; set; } = [];
}

public sealed record CloudinaryUploadSignatureDto(
    string CloudName,
    string ApiKey,
    string UploadPreset,
    string Folder,
    long Timestamp,
    string Signature);
