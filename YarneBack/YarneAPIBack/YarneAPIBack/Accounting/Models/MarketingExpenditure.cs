namespace YarneAPIBack.Accounting.Models;

public class MarketingExpenditure
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public decimal Amount { get; set; }

    public DateTime ExpenseDate { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
}
