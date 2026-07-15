namespace YarneAPIBack.Models;

public class ProductColorImage
{
    public int Id { get; set; }

    public int ProductId { get; set; }

    public int ColorId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public int SortOrder { get; set; }

    public float FocalX { get; set; } = 0.5f;

    public float FocalY { get; set; } = 0.35f;

    public virtual Product Product { get; set; } = null!;

    public virtual Color Color { get; set; } = null!;

    public virtual ProductColor ProductColor { get; set; } = null!;
}
