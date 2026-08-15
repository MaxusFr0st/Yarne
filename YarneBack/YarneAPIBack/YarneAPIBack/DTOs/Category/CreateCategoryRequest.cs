using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Category;

public class CreateCategoryRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = null!;
}
