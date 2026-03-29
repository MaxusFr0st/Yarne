using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class Color
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string HexCode { get; set; } = "#2D241E";

    public virtual ICollection<ProductColor> ProductColors { get; set; } = new List<ProductColor>();
}
