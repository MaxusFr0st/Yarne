namespace YarneAPIBack.Models;

public class ProductColorSizeImage
{
    public int Id { get; set; }

    public int ProductId { get; set; }

    public int ColorId { get; set; }

    public int SizeId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public int SortOrder { get; set; }

    public virtual ProductColor ProductColor { get; set; } = null!;

    public virtual ProductSize ProductSize { get; set; } = null!;
}
