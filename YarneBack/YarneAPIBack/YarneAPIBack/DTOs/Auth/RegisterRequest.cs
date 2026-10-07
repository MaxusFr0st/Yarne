using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Auth;

public class RegisterRequest
{
    // The three below are required, except when registering from an order's status page (StatusToken):
    // the order knows the recipient's name and the email gives a username, so that page asks only for email and password.
    // AuthService.RegisterAsync enforces this.
    [StringLength(100, MinimumLength = 2)]
    public string? FirstName { get; set; }

    [StringLength(100, MinimumLength = 2)]
    public string? LastName { get; set; }

    [StringLength(100, MinimumLength = 3)]
    [RegularExpression(@"^[a-zA-Z0-9_.-]+$", ErrorMessage = "UserName can only contain letters, numbers, underscore, dot and hyphen")]
    public string? UserName { get; set; }

    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; set; } = null!;

    [StringLength(32, MinimumLength = 8)]
    public string? PhoneNumber { get; set; }

    /// <summary>The token of the order status page the person registered from. With a matching guest-order email it attaches their guest orders.</summary>
    [StringLength(64)]
    public string? StatusToken { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*\d).{8,}$", ErrorMessage = "Password must be at least 8 characters and include one uppercase letter and one digit")]
    public string Password { get; set; } = null!;
}
