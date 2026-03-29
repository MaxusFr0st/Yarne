namespace YarneAPIBack.Models;

public class ProductVariantStock
{
    public int ProductId { get; set; }

    public int ColorId { get; set; }

    public int SizeId { get; set; }

    public int QuantityInStock { get; set; }

    public virtual ProductColor ProductColor { get; set; } = null!;

    public virtual ProductSize ProductSize { get; set; } = null!;
}
