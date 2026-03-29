namespace YarneAPIBack.DTOs.Auth;

public class AuthResponse
{
    public string Token { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string UserName { get; set; } = null!;

    public string FullName { get; set; } = null!;

    public string Role { get; set; } = "Customer";

    public DateTime ExpiresAt { get; set; }
}
