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
    /// <summary>
    /// Opt-in flag: when true, purchases of this material are entered as
    /// "N rolls x length-each" and stock/lot displays show a full-rolls +
    /// loose-remainder breakdown. Purely additive/non-retroactive — lots
    /// created before this was set (or for materials that never set it)
    /// simply have null ItemCount/LengthPerItem and render as before.
    /// </summary>
    public bool TrackByItem { get; set; }
    /// <summary>
    /// Convenience pre-fill (e.g. 120 m per roll) for the purchase-order
    /// entry form. Not authoritative — each PurchaseOrderItem snapshots its
    /// own LengthPerItem, which can differ from this default.
    /// </summary>
    public decimal? DefaultLengthPerItem { get; set; }
    public bool IsVoid { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ImportTransactionLine> ImportLines { get; set; } = new List<ImportTransactionLine>();
    public ICollection<MaterialUsageRecord> UsageRecords { get; set; } = new List<MaterialUsageRecord>();
    public ICollection<PurchaseOrderItem> PurchaseOrderItems { get; set; } = new List<PurchaseOrderItem>();
    public ICollection<ProductBomItem> BomItems { get; set; } = new List<ProductBomItem>();
}
