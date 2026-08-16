namespace YarneAPIBack.Accounting.DTOs;

public class StockReportLineDto
{
    public int Id { get; set; }
    public int MaterialId { get; set; }
    public string MaterialName { get; set; } = string.Empty;
    public string MaterialUnit { get; set; } = string.Empty;
    public decimal QtyImported { get; set; }
    public decimal QtyUsed { get; set; }
    public decimal QtyOnHand { get; set; }
    public decimal AvgUnitCost { get; set; }
    public decimal TotalValue { get; set; }
}

public class StockReportSummaryDto
{
    public int Id { get; set; }
    public DateTime SnapshotDate { get; set; }
    public string? Label { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsLocked { get; set; }
    public int LineCount { get; set; }
    public decimal TotalStockValue { get; set; }
}

public class StockReportDetailDto
{
    public int Id { get; set; }
    public DateTime SnapshotDate { get; set; }
    public string? Label { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsLocked { get; set; }
    public decimal TotalStockValue { get; set; }
    public List<StockReportLineDto> Lines { get; set; } = [];
}

public class CreateStockReportRequest
{
    public string? Label { get; set; }
    public string? Notes { get; set; }
}
