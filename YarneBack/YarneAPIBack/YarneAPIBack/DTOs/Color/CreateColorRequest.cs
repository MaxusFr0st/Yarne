using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Color;

public class CreateColorRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = null!;

    [StringLength(20)]
    public string? HexCode { get; set; }
}
