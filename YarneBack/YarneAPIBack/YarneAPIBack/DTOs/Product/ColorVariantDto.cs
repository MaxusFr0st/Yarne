namespace YarneAPIBack.DTOs.Product;

/// <summary>
/// A single image path with its auto-detected focal point (normalized 0–1).
/// </summary>
public class ProductImageDto
{
    public string Src { get; set; } = null!;
    public float FocalX { get; set; } = 0.5f;
    public float FocalY { get; set; } = 0.35f;
}

/// <summary>
/// DTO for frontend compatibility with color variants and images.
/// Image = thumbnail for cards. Images = full gallery for detail page.
/// </summary>
public class ColorVariantDto
{
    public string Name { get; set; } = null!;

    public string? NameUk { get; set; }

    public string Hex { get; set; } = null!;

    /// <summary>Primary/thumbnail image for product cards</summary>
    public ProductImageDto Image { get; set; } = new();

    /// <summary>Full image gallery for product detail page</summary>
    public List<ProductImageDto> Images { get; set; } = new();

    /// <summary>Size-scoped galleries. Key = size name, value = ordered gallery.</summary>
    public Dictionary<string, List<ProductImageDto>> SizeImages { get; set; } = new();

    /// <summary>Size-scoped stock. Key = size name, value = quantity.</summary>
    public Dictionary<string, int> SizeStocks { get; set; } = new();

    /// <summary>Lace-scoped variant data per size. Key = size name.</summary>
    public Dictionary<string, LaceSizeVariantDto> LaceVariants { get; set; } = new();
}

public class LaceSizeVariantDto
{
    public List<ProductImageDto> WithLaceImages { get; set; } = new();

    public List<ProductImageDto> WithoutLaceImages { get; set; } = new();

    public int WithLaceStock { get; set; }

    public int WithoutLaceStock { get; set; }
}
