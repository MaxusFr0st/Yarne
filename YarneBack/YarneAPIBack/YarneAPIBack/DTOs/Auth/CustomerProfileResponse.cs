namespace YarneAPIBack.DTOs.Auth;

public class CustomerProfileResponse
{
    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }
}
