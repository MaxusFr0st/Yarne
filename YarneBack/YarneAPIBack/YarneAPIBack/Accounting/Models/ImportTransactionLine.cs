namespace YarneAPIBack.Accounting.Models;

public class ImportTransactionLine
{
    public int Id { get; set; }
    public int ImportTransactionId { get; set; }
    public int MaterialId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    public ImportTransaction ImportTransaction { get; set; } = null!;
    public Material Material { get; set; } = null!;
}
