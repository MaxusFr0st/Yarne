namespace YarneAPIBack.Accounting.Models;

public class ImportTransaction
{
    public int Id { get; set; }
    public string? Supplier { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public string? Notes { get; set; }
    public string? InvoiceRef { get; set; }
    public bool IsLocked { get; set; }
    public bool IsVoid { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<ImportTransactionLine> Lines { get; set; } = new List<ImportTransactionLine>();
}
