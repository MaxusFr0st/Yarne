namespace YarneAPIBack.Accounting.DTOs;

public class MarketingExpenditureDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateMarketingExpenditureRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateMarketingExpenditureRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Notes { get; set; }
}
