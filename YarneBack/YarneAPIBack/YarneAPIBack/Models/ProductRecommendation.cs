namespace YarneAPIBack.Models;

public partial class ProductRecommendation
{
    public int ProductId { get; set; }

    public int RelatedProductId { get; set; }

    public int SortOrder { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Product RelatedProduct { get; set; } = null!;
}
