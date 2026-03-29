using System;
using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class Collection
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
