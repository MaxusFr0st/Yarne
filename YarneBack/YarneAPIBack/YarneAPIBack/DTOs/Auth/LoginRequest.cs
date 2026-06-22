using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Auth;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; set; } = null!;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Password { get; set; } = null!;
}
