using System;
using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class Product
{
    public int Id { get; set; }

    public string ProductCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public int QuantityInStock { get; set; }

    public string? Material { get; set; }

    public string? ImageUrl { get; set; }

    public int CategoryId { get; set; }

    public int? CollectionId { get; set; }

    public string? ProducerName { get; set; }

    public int? DefaultSizeId { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Category Category { get; set; } = null!;

    public virtual Collection? Collection { get; set; }

    public virtual Size? DefaultSize { get; set; }

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual ICollection<Country> Countries { get; set; } = new List<Country>();

    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    public virtual ICollection<ProductColor> ProductColors { get; set; } = new List<ProductColor>();

    public virtual ICollection<ProductSize> ProductSizes { get; set; } = new List<ProductSize>();
}
