using System;
using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class Category
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    /// <summary>English name of the category; null = the storefront shows Name.</summary>
    public string? NameEn { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
