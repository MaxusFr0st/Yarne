namespace YarneAPIBack.Accounting.Models;

public class Expense
{
    public int Id { get; set; }
    public string Category { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
