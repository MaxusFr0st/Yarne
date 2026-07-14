using System;
using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public int? ProductId { get; set; }

    public string ProductName { get; set; } = string.Empty;

    public string ProductCode { get; set; } = string.Empty;

    public string? ProductImageUrl { get; set; }

    public int? CountryId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public string? ProductSubtitle { get; set; }

    public string? ColorName { get; set; }

    public string? FurnitureColorName { get; set; }

    public string? SizeName { get; set; }

    public bool? WithLace { get; set; }

    public virtual Country? Country { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual Product? Product { get; set; }
}
