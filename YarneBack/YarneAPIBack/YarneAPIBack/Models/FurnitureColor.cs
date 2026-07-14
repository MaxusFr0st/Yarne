using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class FurnitureColor
{
    public int Id { get; set; }

    /// <summary>English name.</summary>
    public string Name { get; set; } = null!;

    /// <summary>Ukrainian name.</summary>
    public string? NameUk { get; set; }

    public string HexCode { get; set; } = "#2D241E";

    public virtual ICollection<ProductFurnitureColor> ProductFurnitureColors { get; set; } = new List<ProductFurnitureColor>();

    public virtual ICollection<Product> ProductsAsDefaultFurnitureColor { get; set; } = new List<Product>();
}
