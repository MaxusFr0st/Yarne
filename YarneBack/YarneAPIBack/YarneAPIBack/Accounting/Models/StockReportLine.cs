namespace YarneAPIBack.Accounting.Models;

public class StockReportLine
{
    public int Id { get; set; }
    public int StockReportId { get; set; }
    public int MaterialId { get; set; }
    public string MaterialName { get; set; } = null!;
    public string MaterialUnit { get; set; } = null!;
    public decimal QtyImported { get; set; }
    public decimal QtyUsed { get; set; }
    public decimal QtyOnHand { get; set; }
    public decimal AvgUnitCost { get; set; }
    public decimal TotalValue { get; set; }

    public StockReport StockReport { get; set; } = null!;
}
