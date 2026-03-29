using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Product;

public class UpdateProductRequest
{
    [Required]
    [StringLength(50)]
    public string ProductCode { get; set; } = null!;

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

    /// <summary>
    /// Optional on update. Null = keep current default size.
    /// </summary>
    public int? DefaultSizeId { get; set; }

    /// <summary>
    /// Optional on update. Null = keep existing size assignments.
    /// </summary>
    public List<int>? SizeIds { get; set; }

    /// <summary>
    /// Optional on update. Null = keep existing product images unchanged.
    /// </summary>
    public List<string>? ImageUrls { get; set; }

    /// <summary>
    /// Optional on update. Used when ColorVariants is not supplied.
    /// Null = keep existing colors unchanged.
    /// </summary>
    public List<int>? ColorIds { get; set; }

    /// <summary>
    /// Optional on update. Null = keep existing color variants unchanged.
    /// Empty list = clear all color variants.
    /// </summary>
    public List<ColorVariantInput>? ColorVariants { get; set; }

    /// <summary>
    /// Optional on update. Null = keep existing color+size image variants.
    /// Empty list = clear all color+size image variants.
    /// </summary>
    public List<ColorSizeVariantInput>? ColorSizeVariants { get; set; }

    /// <summary>
    /// Optional on update. Null = keep existing variant stocks.
    /// Empty list = clear all variant stocks.
    /// </summary>
    public List<VariantStockInput>? VariantStocks { get; set; }

    public bool IsActive { get; set; } = true;
}
