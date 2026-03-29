namespace YarneAPIBack.Models;

public class ProductSize
{
    public int ProductId { get; set; }

    public int SizeId { get; set; }

    public int SortOrder { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Size Size { get; set; } = null!;

    public virtual ICollection<ProductColorSizeImage> ColorSizeImages { get; set; } = new List<ProductColorSizeImage>();

    public virtual ICollection<ProductVariantStock> VariantStocks { get; set; } = new List<ProductVariantStock>();
}
