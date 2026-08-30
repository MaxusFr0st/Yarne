namespace YarneAPIBack.Models;

public partial class ProductColor
{
    public int ProductId { get; set; }

    public int ColorId { get; set; }

    public int SortOrder { get; set; }

    public decimal? Price { get; set; }

    public decimal? PriceWithLace { get; set; }

    public decimal? EurPrice { get; set; }

    public decimal? EurPriceWithLace { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Color Color { get; set; } = null!;

    public virtual ICollection<ProductColorImage> Images { get; set; } = new List<ProductColorImage>();

    public virtual ICollection<ProductColorSizeImage> SizeImages { get; set; } = new List<ProductColorSizeImage>();
}
