namespace YarneAPIBack.Accounting.DTOs;

public class AccountingDashboardDto
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }

    // Revenue from orders with status "Received"
    public decimal SoldRevenue { get; set; }
    public int TotalOrdersSold { get; set; }

    // Material import spending in period
    public decimal ImportSpend { get; set; }

    // General expenses in period
    public decimal ExpenseSpend { get; set; }

    public decimal TotalSpent { get; set; }
    public decimal Net { get; set; }

    // Current material stock value (all materials, not date-filtered)
    public decimal MaterialStockValue { get; set; }
    public int MaterialCount { get; set; }
}
