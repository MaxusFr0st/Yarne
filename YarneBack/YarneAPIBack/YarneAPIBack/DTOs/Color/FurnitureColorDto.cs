using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Color;

public class FurnitureColorDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? NameUk { get; set; }
    public string HexCode { get; set; } = "#2D241E";
}

public class CreateFurnitureColorRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = null!;

    [StringLength(100)]
    public string? NameUk { get; set; }

    [StringLength(20)]
    public string? HexCode { get; set; }
}
