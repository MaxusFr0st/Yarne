namespace YarneAPIBack.Accounting.DTOs;

public class AccountingPurchaseDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
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

    public int QuantityRemaining => Quantity - QuantitySold;
    public decimal TotalCost => Quantity * UnitCost;
    public decimal RemainingValue => QuantityRemaining * UnitCost;
}

public class CreateAccountingPurchaseRequest
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
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
}

public class UpdateAccountingPurchaseRequest
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
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
}
