namespace YarneAPIBack.Accounting.DTOs;

public sealed record OperatingExpenseCategoryDto(
    int Id,
    string Name,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record OperatingExpenseDto(
    int Id,
    int CategoryId,
    string CategoryName,
    DateTime Date,
    long AmountCents,
    long VatAmountCents,
    long BaseAmountCents,
    long BaseVatAmountCents,
    string CurrencyCode,
    decimal ExchangeRateToBase,
    string? Vendor,
    string? Description,
    string? PaymentMethod,
    string? ReceiptUrl,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed class SaveOperatingExpenseCategoryRequest
{
    public string Name { get; set; } = string.Empty;
}

public sealed class SaveOperatingExpenseRequest
{
    public int CategoryId { get; set; }
    public DateTime Date { get; set; }
    public long AmountCents { get; set; }
    public long VatAmountCents { get; set; }
    public string CurrencyCode { get; set; } = "UAH";
    public decimal? ExchangeRateToBase { get; set; }
    public string? Vendor { get; set; }
    public string? Description { get; set; }
    public string? PaymentMethod { get; set; }
    public string? ReceiptUrl { get; set; }
}
