namespace YarneAPIBack.DTOs.Order;

public class AdminOrdersSummaryDto
{
    public int TotalOrders { get; set; }

    public decimal TotalRevenue { get; set; }

    public int PendingOrders { get; set; }
}
