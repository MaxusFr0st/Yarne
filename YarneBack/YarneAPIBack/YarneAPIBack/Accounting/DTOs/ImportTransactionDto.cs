namespace YarneAPIBack.Accounting.DTOs;

public class ImportTransactionLineDto
{
    public int Id { get; set; }
    public int MaterialId { get; set; }
    public string MaterialName { get; set; } = string.Empty;
    public string MaterialUnit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class ImportTransactionDto
{
    public int Id { get; set; }
    public string? Supplier { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public string? Notes { get; set; }
    public string? InvoiceRef { get; set; }
    public DateTime CreatedAt { get; set; }
    public decimal TotalAmount { get; set; }
    public List<ImportTransactionLineDto> Lines { get; set; } = [];
}

public class ImportTransactionSummaryDto
{
    public int Id { get; set; }
    public string? Supplier { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public string? InvoiceRef { get; set; }
    public DateTime CreatedAt { get; set; }
    public decimal TotalAmount { get; set; }
    public int LineCount { get; set; }
}

public class CreateImportTransactionLineRequest
{
    public int MaterialId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class CreateImportTransactionRequest
{
    public string? Supplier { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public string? Notes { get; set; }
    public string? InvoiceRef { get; set; }
    public List<CreateImportTransactionLineRequest> Lines { get; set; } = [];
}

public class UpdateImportTransactionRequest
{
    public string? Supplier { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public string? Notes { get; set; }
    public string? InvoiceRef { get; set; }
    public List<CreateImportTransactionLineRequest> Lines { get; set; } = [];
}
