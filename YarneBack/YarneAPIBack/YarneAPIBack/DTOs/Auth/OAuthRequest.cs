using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Auth;

public class OAuthRequest
{
    [Required]
    public string IdToken { get; set; } = null!;
}
