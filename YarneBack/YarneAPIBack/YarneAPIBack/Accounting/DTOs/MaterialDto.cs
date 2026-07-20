namespace YarneAPIBack.Accounting.DTOs;

public class MaterialDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Category { get; set; }
    public decimal ReorderThreshold { get; set; }
    public bool IsActive { get; set; }
    public bool TrackByItem { get; set; }
    public decimal? DefaultLengthPerItem { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MaterialStockDto
{
    public int MaterialId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public decimal QtyImported { get; set; }
    public decimal QtyUsed { get; set; }
    public decimal QtyOnHand { get; set; }
    public decimal AvgUnitCost { get; set; }
    public decimal TotalStockValue { get; set; }
    public bool TrackByItem { get; set; }
    /// <summary>Sum of floor(lot.QuantityRemaining / lot.LengthPerItem) across this material's item-tracked, non-void lots.</summary>
    public int WholeItemsRemaining { get; set; }
    /// <summary>Sum of each item-tracked lot's remainder (QuantityRemaining mod LengthPerItem).</summary>
    public decimal LooseRemainder { get; set; }
}

public class CreateMaterialRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Unit { get; set; } = "pcs";
    public string? Sku { get; set; }
    public string? Category { get; set; }
    public decimal ReorderThreshold { get; set; }
    public bool IsActive { get; set; } = true;
    public bool TrackByItem { get; set; }
    public decimal? DefaultLengthPerItem { get; set; }
}

public class UpdateMaterialRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Unit { get; set; } = "pcs";
    public string? Sku { get; set; }
    public string? Category { get; set; }
    public decimal ReorderThreshold { get; set; }
    public bool IsActive { get; set; } = true;
    public bool TrackByItem { get; set; }
    public decimal? DefaultLengthPerItem { get; set; }
}
