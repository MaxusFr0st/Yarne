namespace YarneAPIBack.DTOs.Product;

public class SizeOptionDto
{
    public string Name { get; set; } = null!;

    public string? NameUk { get; set; }

    public decimal? WidthCm { get; set; }

    public decimal? HeightCm { get; set; }

    public decimal? DepthCm { get; set; }

    public decimal? HandleCm { get; set; }
}
