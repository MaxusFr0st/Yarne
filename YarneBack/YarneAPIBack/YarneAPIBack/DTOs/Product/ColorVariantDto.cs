namespace YarneAPIBack.DTOs.Product;

/// <summary>
/// DTO for frontend compatibility with color variants and images.
/// ImageUrl = thumbnail for cards. ImageUrls = full gallery for detail page.
/// </summary>
public class ColorVariantDto
{
    public string Name { get; set; } = null!;

    public string Hex { get; set; } = null!;

    /// <summary>Primary/thumbnail image for product cards</summary>
    public string ImageUrl { get; set; } = null!;

    /// <summary>Full image gallery for product detail page (first = thumbnail)</summary>
    public List<string> ImageUrls { get; set; } = new();

    /// <summary>Size-scoped galleries. Key = size name, value = ordered gallery.</summary>
    public Dictionary<string, List<string>> SizeImages { get; set; } = new();

    /// <summary>Size-scoped stock. Key = size name, value = quantity.</summary>
    public Dictionary<string, int> SizeStocks { get; set; } = new();
}
