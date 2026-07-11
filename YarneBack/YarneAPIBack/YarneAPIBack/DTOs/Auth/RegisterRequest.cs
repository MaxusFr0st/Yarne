using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Auth;

public class RegisterRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string FirstName { get; set; } = null!;

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string LastName { get; set; } = null!;

    [Required]
    [StringLength(100, MinimumLength = 3)]
    [RegularExpression(@"^[a-zA-Z0-9_.-]+$", ErrorMessage = "UserName can only contain letters, numbers, underscore, dot and hyphen")]
    public string UserName { get; set; } = null!;

    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; set; } = null!;

    [StringLength(32, MinimumLength = 8)]
    public string? PhoneNumber { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*\d).{8,}$", ErrorMessage = "Password must be at least 8 characters and include one uppercase letter and one digit")]
    public string Password { get; set; } = null!;
}
