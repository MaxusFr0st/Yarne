using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class Color
{
    public int Id { get; set; }

    /// <summary>English name.</summary>
    public string Name { get; set; } = null!;

    /// <summary>Ukrainian name.</summary>
    public string? NameUk { get; set; }

    public string HexCode { get; set; } = "#2D241E";

    public virtual ICollection<ProductColor> ProductColors { get; set; } = new List<ProductColor>();

    public virtual ICollection<Product> ProductsAsDefaultColor { get; set; } = new List<Product>();
}
