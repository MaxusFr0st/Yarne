using YarneAPIBack.DTOs.Auth;

namespace YarneAPIBack.Services.Contracts;

public interface IRefreshTokenService
{
    Task AttachNewRefreshAsync(AuthResponse access, CancellationToken ct = default);

    Task<AuthResponse?> RotateAsync(string rawRefreshToken, CancellationToken ct = default);

    Task RevokeRawAsync(string? rawRefreshToken, CancellationToken ct = default);
}
