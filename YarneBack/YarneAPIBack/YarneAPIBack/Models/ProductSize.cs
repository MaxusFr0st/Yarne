namespace YarneAPIBack.Models;

public class ProductSize
{
    public int ProductId { get; set; }

    public int SizeId { get; set; }

    public int SortOrder { get; set; }

    /// <summary>Measurements of this product in this size, in centimetres (0 &lt; value &lt;= 500). All optional.</summary>
    public decimal? WidthCm { get; set; }

    public decimal? HeightCm { get; set; }

    public decimal? DepthCm { get; set; }

    public decimal? HandleCm { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Size Size { get; set; } = null!;

    public virtual ICollection<ProductColorSizeImage> ColorSizeImages { get; set; } = new List<ProductColorSizeImage>();
}
