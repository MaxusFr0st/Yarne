namespace YarneAPIBack.Accounting.Models;

public class StockReport
{
    public int Id { get; set; }
    public DateTime SnapshotDate { get; set; }
    public string? Label { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsLocked { get; set; } = true;
    public bool IsVoid { get; set; }

    public ICollection<StockReportLine> Lines { get; set; } = new List<StockReportLine>();
}
