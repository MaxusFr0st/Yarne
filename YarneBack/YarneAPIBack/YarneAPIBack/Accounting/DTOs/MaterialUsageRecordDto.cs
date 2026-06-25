namespace YarneAPIBack.Accounting.DTOs;

public class MaterialUsageRecordDto
{
    public int Id { get; set; }
    public int MaterialId { get; set; }
    public string MaterialName { get; set; } = string.Empty;
    public int? OrderId { get; set; }
    public decimal QuantityUsed { get; set; }
    public DateTime UsageDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateMaterialUsageRequest
{
    public int MaterialId { get; set; }
    public int? OrderId { get; set; }
    public decimal QuantityUsed { get; set; }
    public DateTime UsageDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateMaterialUsageRequest
{
    public int MaterialId { get; set; }
    public int? OrderId { get; set; }
    public decimal QuantityUsed { get; set; }
    public DateTime UsageDate { get; set; }
    public string? Notes { get; set; }
}
