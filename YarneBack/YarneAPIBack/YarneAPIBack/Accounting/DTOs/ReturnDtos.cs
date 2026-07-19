namespace YarneAPIBack.Accounting.DTOs;

public sealed record ReturnOrderItemDto(
    int Id,
    int SalesOrderItemId,
    int ProductId,
    string ProductName,
    int Quantity,
    long RefundAmountCents,
    long VatReversedCents,
    long CogsReversedCents,
    long FeeReversedCents,
    long MaterialsReclaimedCents);

public sealed record ReturnOrderDto(
    int Id,
    int SalesOrderId,
    DateTime ReturnDate,
    string Reason,
    string Resolution,
    long RefundAmountCents,
    string CurrencyCode,
    string Status,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<ReturnOrderItemDto> Items);

public sealed class CreateReturnOrderItemRequest
{
    public int SalesOrderItemId { get; set; }
    public int Quantity { get; set; }
}

public sealed class CreateReturnOrderRequest
{
    public int SalesOrderId { get; set; }
    public DateTime ReturnDate { get; set; }
    public string Reason { get; set; } = "customer_request";
    public string Resolution { get; set; } = "restock";
    public long RefundAmountCents { get; set; }
    public string? Notes { get; set; }
    public List<CreateReturnOrderItemRequest> Items { get; set; } = [];
}
