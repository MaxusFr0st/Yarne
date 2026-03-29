namespace YarneAPIBack.Models;

public partial class Size
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<ProductSize> ProductSizes { get; set; } = new List<ProductSize>();

    public virtual ICollection<Product> ProductsAsDefaultSize { get; set; } = new List<Product>();
}
