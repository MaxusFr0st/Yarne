using System;
using System.Collections.Generic;
using YarneAPIBack.Accounting.Models;

namespace YarneAPIBack.Models;

public partial class Product
{
    public int Id { get; set; }

    public string ProductCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public long SellingPriceCents { get; set; }

    public string SellingCurrencyCode { get; set; } = "UAH";

    public decimal MarginThresholdPct { get; set; } = 60m;

    public int QuantityInStock { get; set; }

    public string? Material { get; set; }

    public string? ImageUrl { get; set; }

    public int CategoryId { get; set; }

    public int? CollectionId { get; set; }

    public string? ProducerName { get; set; }

    public int? DefaultSizeId { get; set; }

    public int? DefaultColorId { get; set; }

    public int? DefaultFurnitureColorId { get; set; }

    public bool IsActive { get; set; }

    public bool IsNew { get; set; }

    public bool IsBestseller { get; set; }

    public bool Lace { get; set; }

    public bool SuggestionsConfigured { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public int? CreatedBy { get; set; }

    public bool IsVoid { get; set; }

    public virtual Category Category { get; set; } = null!;

    public virtual Collection? Collection { get; set; }

    public virtual Size? DefaultSize { get; set; }

    public virtual Color? DefaultColor { get; set; }

    public virtual FurnitureColor? DefaultFurnitureColor { get; set; }

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual ICollection<Country> Countries { get; set; } = new List<Country>();

    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    public virtual ICollection<ProductColor> ProductColors { get; set; } = new List<ProductColor>();

    public virtual ICollection<ProductFurnitureColor> ProductFurnitureColors { get; set; } = new List<ProductFurnitureColor>();

    public virtual ICollection<ProductSize> ProductSizes { get; set; } = new List<ProductSize>();

    public virtual ICollection<ProductRecommendation> Recommendations { get; set; } = new List<ProductRecommendation>();

    public virtual AccountingCurrency SellingCurrency { get; set; } = null!;

    public virtual ProductBom? Bom { get; set; }

    public virtual FinishedGoodsInventory? FinishedGoodsInventory { get; set; }

    public virtual ICollection<ProductionOrder> ProductionOrders { get; set; } = new List<ProductionOrder>();
}
