using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Auth;

public class ForgotPasswordRequest
{
    [StringLength(255)]
    public string? Email { get; set; }

    /// <summary>"uk" or "en": the language of the email. Ukrainian when missing.</summary>
    [StringLength(8)]
    public string? Locale { get; set; }
}
