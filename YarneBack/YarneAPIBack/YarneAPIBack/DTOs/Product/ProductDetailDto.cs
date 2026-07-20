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

    /// <summary>
    /// Added price (in the same UAH units as <see cref="ProductDto.Price"/>) when the customer
    /// opts into lace — the sum of this product's "with_lace" sale-components' own prices,
    /// computed fresh from the component product's catalog price. Zero when the product has no
    /// lace composition. The with-lace displayed price is Price + LaceSurcharge.
    /// </summary>
    public decimal LaceSurcharge { get; set; }

    /// <summary>
    /// Available lace colors for this product (from its "with_lace" sale-composition rows that
    /// have a configured color), each with its own surcharge. Empty when the product has no
    /// color-mapped lace options (e.g. not yet migrated — see recipe editor hint).
    /// </summary>
    public List<LaceColorOptionDto> LaceColorOptions { get; set; } = new();

    public List<SuggestedProductDto> SuggestedProducts { get; set; } = new();
}

/// <summary>One selectable lace color option and its price add-on (UAH units).</summary>
public sealed record LaceColorOptionDto(
    int ColorId,
    string ColorName,
    string? ColorNameUk,
    string ColorHex,
    decimal Surcharge);
