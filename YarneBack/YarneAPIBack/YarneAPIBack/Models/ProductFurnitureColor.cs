namespace YarneAPIBack.Models;

public partial class ProductFurnitureColor
{
    public int ProductId { get; set; }

    public int FurnitureColorId { get; set; }

    public int SortOrder { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual FurnitureColor FurnitureColor { get; set; } = null!;
}
