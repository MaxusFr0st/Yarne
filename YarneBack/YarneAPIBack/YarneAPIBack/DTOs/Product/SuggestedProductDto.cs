namespace YarneAPIBack.DTOs.Product;

public class SuggestedProductDto
{
    public string ProductCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public decimal Price { get; set; }

    public ProductImageDto? PrimaryImage { get; set; }

    public string CategoryName { get; set; } = null!;

    public bool IsNew { get; set; }

    public bool IsBestseller { get; set; }

    public string? DefaultColorName { get; set; }

    public List<ColorVariantDto> Colors { get; set; } = new();
}
