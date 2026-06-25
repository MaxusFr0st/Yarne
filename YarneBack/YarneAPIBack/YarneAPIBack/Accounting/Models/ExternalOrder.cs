namespace YarneAPIBack.Accounting.Models;

/// <summary>Non-website orders (markets, direct sales, etc.) with separate EXT- IDs.</summary>
public class ExternalOrder
{
    public int Id { get; set; }
    public string? Label { get; set; }
    public string? CustomerName { get; set; }
    public DateTime OrderDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<MaterialUsageRecord> UsageRecords { get; set; } = new List<MaterialUsageRecord>();
}
