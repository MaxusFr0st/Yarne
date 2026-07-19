namespace YarneAPIBack.Accounting.Models;

public class Material
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Unit { get; set; } = "pcs";
    public string? Sku { get; set; }
    public string? Category { get; set; }
    public decimal ReorderThreshold { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ImportTransactionLine> ImportLines { get; set; } = new List<ImportTransactionLine>();
    public ICollection<MaterialUsageRecord> UsageRecords { get; set; } = new List<MaterialUsageRecord>();
    public ICollection<PurchaseOrderItem> PurchaseOrderItems { get; set; } = new List<PurchaseOrderItem>();
    public ICollection<ProductBomItem> BomItems { get; set; } = new List<ProductBomItem>();
}
