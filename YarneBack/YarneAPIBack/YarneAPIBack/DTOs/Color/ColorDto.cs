namespace YarneAPIBack.DTOs.Color;

public class ColorDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? NameUk { get; set; }
    public string HexCode { get; set; } = "#2D241E";
    public int? LaceProductId { get; set; }
    public string? LaceProductName { get; set; }
}
