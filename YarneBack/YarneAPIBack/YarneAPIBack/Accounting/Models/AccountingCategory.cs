namespace YarneAPIBack.Accounting.Models;

public class AccountingCategory
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public ICollection<AccountingPurchase> Purchases { get; set; } = new List<AccountingPurchase>();
}
