namespace YarneAPIBack.Models;

public partial class ProductImage
{
    public int Id { get; set; }

    public int ProductId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public int SortOrder { get; set; }

    public bool IsPrimary { get; set; }

    public DateTime CreatedAt { get; set; }

    public float FocalX { get; set; } = 0.5f;

    public float FocalY { get; set; } = 0.35f;

    public virtual Product Product { get; set; } = null!;
}
