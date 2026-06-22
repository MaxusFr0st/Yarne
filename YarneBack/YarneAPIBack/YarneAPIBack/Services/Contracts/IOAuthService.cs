using YarneAPIBack.DTOs.Auth;

namespace YarneAPIBack.Services.Contracts;

public interface IOAuthService
{
    Task<AuthResponse> HandleGoogleAsync(string idToken, CancellationToken ct = default);

    Task<AuthResponse> HandleAppleAsync(string idToken, CancellationToken ct = default);
}
