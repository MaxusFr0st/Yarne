using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Category;

public class CreateCategoryRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = null!;

    /// <summary>Optional on update (null = keep); empty string clears it.</summary>
    [StringLength(100)]
    public string? NameEn { get; set; }
}
