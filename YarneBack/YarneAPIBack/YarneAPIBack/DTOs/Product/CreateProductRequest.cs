using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Product;

public class CreateProductRequest
{
    [StringLength(50)]
    public string? ProductCode { get; set; }

    [Required]
    [StringLength(255)]
    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    [Range(0, int.MaxValue)]
    public int QuantityInStock { get; set; }

    [StringLength(100)]
    public string? Material { get; set; }

    [Required]
    public int CategoryId { get; set; }

    public int? CollectionId { get; set; }

    [StringLength(255)]
    public string? ProducerName { get; set; }

    public int? DefaultSizeId { get; set; }

    public int? DefaultColorId { get; set; }

    public int? DefaultFurnitureColorId { get; set; }

    public bool IsNew { get; set; }

    public bool IsBestseller { get; set; }

    public bool Lace { get; set; }

    public bool IsInternalComponent { get; set; }

    public List<int> SizeIds { get; set; } = new();

    public List<string> ImageUrls { get; set; } = new();

    public List<int> ColorIds { get; set; } = new();

    public List<int> FurnitureColorIds { get; set; } = new();

    /// <summary>Legacy per-color image sets (mapped to default size if provided).</summary>
    public List<ColorVariantInput> ColorVariants { get; set; } = new();

    /// <summary>Per-color+size image sets.</summary>
    public List<ColorSizeVariantInput> ColorSizeVariants { get; set; } = new();

    /// <summary>Per-color+size stock values (optional).</summary>
    public List<VariantStockInput> VariantStocks { get; set; } = new();

    /// <summary>Product codes for per-product suggested items (max 10, each max 50 chars).</summary>
    [MaxLength(10)]
    public List<string>? SuggestedProductCodes { get; set; }
}

public class ColorVariantInput
{
    public int ColorId { get; set; }
    public List<string> ImageUrls { get; set; } = new();
}

public class ColorSizeVariantInput
{
    public int ColorId { get; set; }
    public int SizeId { get; set; }
    public bool Lace { get; set; }
    public List<string> ImageUrls { get; set; } = new();
}

public class VariantStockInput
{
    public int ColorId { get; set; }
    public int SizeId { get; set; }
    public bool Lace { get; set; }
    public int QuantityInStock { get; set; }
}
