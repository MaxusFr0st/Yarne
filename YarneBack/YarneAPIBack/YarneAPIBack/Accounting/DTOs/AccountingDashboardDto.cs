namespace YarneAPIBack.Accounting.DTOs;

public class AccountingDashboardDto
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }

    public decimal OrderRevenue { get; set; }
    public decimal ManualSaleRevenue { get; set; }
    public decimal TotalRevenue { get; set; }

    public decimal PurchaseSpend { get; set; }
    public decimal MarketingSpend { get; set; }
    public decimal TotalSpent { get; set; }

    public decimal Net { get; set; }

    public int TotalOrdersSold { get; set; }
    public int RemainingInventoryItems { get; set; }
    public decimal RemainingInventoryValue { get; set; }
}
