using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public sealed class RefreshTokenService : IRefreshTokenService
{
    private readonly YarneDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly IAccessTokenIssuer _accessTokens;

    public RefreshTokenService(
        YarneDbContext context,
        IOptions<JwtSettings> jwtSettings,
        IAccessTokenIssuer accessTokens)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
        _accessTokens = accessTokens;
    }

    public async Task AttachNewRefreshAsync(AuthResponse access, CancellationToken ct = default)
    {
        if (access.CustomerId <= 0)
            throw new InvalidOperationException("AuthResponse.CustomerId is required to issue a refresh token.");

        var raw = CreateRawToken();
        var expires = DateTime.UtcNow.Add(_jwtSettings.RefreshExpiration);
        _context.RefreshTokens.Add(new RefreshToken
        {
            CustomerId = access.CustomerId,
            TokenHash = HashToken(raw),
            ExpiresAtUtc = expires,
            CreatedAtUtc = DateTime.UtcNow,
        });
        await _context.SaveChangesAsync(ct);

        access.RefreshToken = raw;
        access.RefreshExpiresAt = expires;
    }

    public async Task<AuthResponse?> RotateAsync(string rawRefreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
            return null;

        var hash = HashToken(rawRefreshToken);

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        try
        {
            var existing = await _context.RefreshTokens
                .Include(t => t.Customer)
                .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

            if (existing == null)
            {
                await tx.RollbackAsync(ct);
                return null;
            }

            // Stolen/replayed refresh after rotation → kill all active sessions for that customer.
            if (existing.RevokedAtUtc != null)
            {
                await RevokeAllActiveForCustomerAsync(existing.CustomerId, ct);
                await tx.CommitAsync(ct);
                return null;
            }

            if (existing.ExpiresAtUtc <= DateTime.UtcNow
                || existing.Customer == null
                || !existing.Customer.IsActive)
            {
                existing.RevokedAtUtc = DateTime.UtcNow;
                await _context.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return null;
            }

            var now = DateTime.UtcNow;
            // Atomic claim: only one concurrent rotator wins.
            var claimed = await _context.RefreshTokens
                .Where(t => t.Id == existing.Id && t.RevokedAtUtc == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, now), ct);

            if (claimed != 1)
            {
                await tx.RollbackAsync(ct);
                return null;
            }

            var access = await _accessTokens.IssueAsync(existing.Customer, ct);

            var newRaw = CreateRawToken();
            var newExpires = DateTime.UtcNow.Add(_jwtSettings.RefreshExpiration);
            var replacement = new RefreshToken
            {
                CustomerId = existing.CustomerId,
                TokenHash = HashToken(newRaw),
                ExpiresAtUtc = newExpires,
                CreatedAtUtc = DateTime.UtcNow,
            };
            _context.RefreshTokens.Add(replacement);
            await _context.SaveChangesAsync(ct);

            await _context.RefreshTokens
                .Where(t => t.Id == existing.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.ReplacedByTokenId, replacement.Id), ct);

            await tx.CommitAsync(ct);

            access.RefreshToken = newRaw;
            access.RefreshExpiresAt = newExpires;
            return access;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task RevokeRawAsync(string? rawRefreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
            return;

        var hash = HashToken(rawRefreshToken);
        await _context.RefreshTokens
            .Where(t => t.TokenHash == hash && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, DateTime.UtcNow), ct);
    }

    private async Task RevokeAllActiveForCustomerAsync(int customerId, CancellationToken ct)
    {
        await _context.RefreshTokens
            .Where(t => t.CustomerId == customerId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, DateTime.UtcNow), ct);
    }

    private static string CreateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace("+", "-")
            .Replace("/", "_");
    }

    internal static string HashToken(string rawToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(hash);
    }
}
