using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Size;

public class CreateSizeRequest
{
    [Required]
    [StringLength(50)]
    public string Name { get; set; } = null!;

    [StringLength(100)]
    public string? NameUk { get; set; }
}
