using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Country;

public class CreateCountryRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = null!;
}
