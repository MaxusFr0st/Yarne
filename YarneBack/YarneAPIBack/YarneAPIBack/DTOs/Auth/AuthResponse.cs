using System.Text.Json.Serialization;

namespace YarneAPIBack.DTOs.Auth;

public class AuthResponse
{
    /// <summary>JWT for Set-Cookie only — never serialized to JSON.</summary>
    [JsonIgnore]
    public string Token { get; set; } = null!;

    /// <summary>Opaque refresh token for Set-Cookie only — never serialized to JSON.</summary>
    [JsonIgnore]
    public string? RefreshToken { get; set; }

    [JsonIgnore]
    public DateTime RefreshExpiresAt { get; set; }

    [JsonIgnore]
    public int CustomerId { get; set; }

    public string Email { get; set; } = null!;

    public string UserName { get; set; } = null!;

    public string FullName { get; set; } = null!;

    public string Role { get; set; } = "Customer";

    public DateTime ExpiresAt { get; set; }
}
