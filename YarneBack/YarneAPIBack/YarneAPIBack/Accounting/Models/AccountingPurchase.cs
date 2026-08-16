namespace YarneAPIBack.Accounting.Models;

public class AccountingPurchase
{
    public int Id { get; set; }

    public int CategoryId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? Supplier { get; set; }

    public DateTime PurchaseDate { get; set; }

    public DateTime? ReceivedDate { get; set; }

    public DateTime? SoldDate { get; set; }

    public int Quantity { get; set; }

    public int QuantitySold { get; set; }

    public decimal UnitCost { get; set; }

    public decimal? SaleUnitPrice { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public AccountingCategory Category { get; set; } = null!;
}
