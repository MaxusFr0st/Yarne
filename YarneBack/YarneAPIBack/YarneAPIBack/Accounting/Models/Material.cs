namespace YarneAPIBack.Accounting.Models;

public class Material
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Unit { get; set; } = "pcs";
    public string? Sku { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ICollection<ImportTransactionLine> ImportLines { get; set; } = new List<ImportTransactionLine>();
    public ICollection<MaterialUsageRecord> UsageRecords { get; set; } = new List<MaterialUsageRecord>();
}
