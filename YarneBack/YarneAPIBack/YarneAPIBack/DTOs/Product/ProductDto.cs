namespace YarneAPIBack.DTOs.Product;

public class ProductDto
{
    public int Id { get; set; }

    public string ProductCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public int QuantityInStock { get; set; }

    public string? Material { get; set; }

    public string? PrimaryImageUrl { get; set; }

    public List<string> ImageUrls { get; set; } = new();

    public List<ColorVariantDto> Colors { get; set; } = new();

    public List<string> Sizes { get; set; } = new();

    public string? DefaultSize { get; set; }

    public string CategoryName { get; set; } = null!;

    public string? CollectionName { get; set; }

    public string? ProducerName { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}
