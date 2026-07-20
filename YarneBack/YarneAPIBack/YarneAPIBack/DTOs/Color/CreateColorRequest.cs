using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Color;

public class CreateColorRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = null!;

    [StringLength(100)]
    public string? NameUk { get; set; }

    [StringLength(20)]
    public string? HexCode { get; set; }

    public int? LaceProductId { get; set; }
}
