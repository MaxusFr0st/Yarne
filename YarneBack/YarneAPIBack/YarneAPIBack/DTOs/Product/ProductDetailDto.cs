namespace YarneAPIBack.DTOs.Product;

/// <summary>
/// Rich product DTO for product detail page (includes images as color-like variants for frontend compatibility)
/// </summary>
public class ProductDetailDto : ProductDto
{
    public string? Subtitle { get; set; }

    public List<string> Details { get; set; } = new();

    public List<string> SuggestedProductCodes { get; set; } = new();

    public bool HasConfiguredSuggestions { get; set; }

    public List<SuggestedProductDto> SuggestedProducts { get; set; } = new();
}
