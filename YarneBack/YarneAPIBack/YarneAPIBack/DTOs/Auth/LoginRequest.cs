using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Auth;

public class LoginRequest
{
    [Required]
    public string Email { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;

    /// <summary>The token of the order status page the person signed in from; attaches their guest orders when the email matches.</summary>
    [StringLength(64)]
    public string? StatusToken { get; set; }
}
