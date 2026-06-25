namespace YarneAPIBack.Accounting.Models;

public class MaterialUsageRecord
{
    public int Id { get; set; }
    public int MaterialId { get; set; }
    public int? OrderId { get; set; }
    public decimal QuantityUsed { get; set; }
    public DateTime UsageDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Material Material { get; set; } = null!;
}
