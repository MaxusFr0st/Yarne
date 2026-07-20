namespace YarneAPIBack.Accounting.DTOs;

public sealed record AccountingCustomerDto(
    int Id,
    string FirstName,
    string LastName,
    string Name,
    string Email,
    string? PhoneNumber,
    string? Address);

public sealed class SaveAccountingCustomerRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public int? CountryId { get; set; }
}

public sealed record SalesChannelDto(
    int Id,
    string Name,
    string FeeType,
    decimal FeePercentage,
    long FeeFlatCents,
    string CurrencyCode,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed class SaveSalesChannelRequest
{
    public string Name { get; set; } = string.Empty;
    public string FeeType { get; set; } = "none";
    public decimal FeePercentage { get; set; }
    public long FeeFlatCents { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
}

public sealed record AccountingSalesOrderItemDto(
    int Id,
    int ProductId,
    int? ParentOrderItemId,
    string ProductName,
    string ProductSku,
    int Quantity,
    long ListedPriceCents,
    long ListedTotalCents,
    long ChannelFeeShareCents,
    long NetTotalCents,
    long UnitCogsCents,
    long TotalCogsCents,
    long VatAmountCents);

public sealed record AccountingSalesOrderDto(
    int Id,
    int CustomerId,
    string CustomerName,
    int? ChannelId,
    string ChannelName,
    DateTime OrderDate,
    string Status,
    string CurrencyCode,
    decimal ExchangeRateToBase,
    long ListedRevenueCents,
    long ChannelFeeCents,
    long NetRevenueCents,
    long TotalCogsCents,
    long VatAmountCents,
    bool IsChannelFeeOverridden,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<AccountingSalesOrderItemDto> Items);

public sealed class CreateAccountingSalesOrderItemRequest
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public long? ListedPriceCents { get; set; }
    public long VatAmountCents { get; set; }

    /// <summary>
    /// When true, "with_lace" sale-time components of this product are composed onto the sale
    /// as their own order lines (FIFO-costed separately). "always" components apply regardless.
    /// </summary>
    public bool WithLace { get; set; }

    /// <summary>
    /// The chosen lace color (Color.Id) when <see cref="WithLace"/> is true and the product has
    /// configured "with_lace" color options; required in that case.
    /// </summary>
    public int? LaceColorId { get; set; }
}

public sealed class CreateAccountingSalesOrderRequest
{
    public int CustomerId { get; set; }
    public int ChannelId { get; set; }
    public DateTime OrderDate { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public decimal? ExchangeRateToBase { get; set; }
    public long? ChannelFeeCents { get; set; }
    public List<CreateAccountingSalesOrderItemRequest> Items { get; set; } = [];
}
