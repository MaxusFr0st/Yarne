using YarneAPIBack.DTOs.Auth;

namespace YarneAPIBack.Services.Contracts;

public interface IAuthService
{
    Task<AuthResponse?> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default);
}
