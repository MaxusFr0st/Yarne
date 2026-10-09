using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

/// <summary>
/// "Forgot password": an emailed single-use link. The token is 32 random bytes and only its SHA-256 hash is stored.
/// Asking never reveals whether an email has an account: the same answer and (about) the same time every time.
/// </summary>
public class PasswordResetService
{
    public static readonly TimeSpan TokenLifetime = TimeSpan.FromMinutes(30);

    /// <summary>At most this many reset emails per account per hour.</summary>
    public const int MaxEmailsPerHour = 3;

    /// <summary>Every request takes at least this long, so a known and an unknown email cannot be told apart by timing.</summary>
    public TimeSpan MinimumDuration { get; set; } = TimeSpan.FromMilliseconds(1000);

    // Google/Apple accounts have no token to count; this keeps one person from being mailed over and over.
    private static readonly MemoryCache OAuthMailSent = new(new MemoryCacheOptions());
    private static readonly TimeSpan OAuthMailGap = TimeSpan.FromMinutes(15);

    private readonly YarneDbContext _context;
    private readonly IEmailService _email;
    private readonly IConfiguration _configuration;
    private readonly IAccessTokenIssuer _accessTokens;
    private readonly IRefreshTokenService _refreshTokens;
    private readonly ILogger<PasswordResetService> _logger;

    public PasswordResetService(
        YarneDbContext context,
        IEmailService email,
        IConfiguration configuration,
        IAccessTokenIssuer accessTokens,
        IRefreshTokenService refreshTokens,
        ILogger<PasswordResetService> logger)
    {
        _context = context;
        _email = email;
        _configuration = configuration;
        _accessTokens = accessTokens;
        _refreshTokens = refreshTokens;
        _logger = logger;
    }

    /// <summary>The email that was last handed to the background sender (tests wait on it; the request never does).</summary>
    public Task EmailDispatched { get; private set; } = Task.CompletedTask;

    /// <summary>Starts a reset for this email if it belongs to an active account. Returns nothing, whatever happens.</summary>
    public async Task RequestAsync(string? email, string? locale, CancellationToken ct = default)
    {
        var started = DateTime.UtcNow;
        try
        {
            await RequestCoreAsync(email, locale, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // A failure must look like success from outside too.
            _logger.LogError(ex, "Password reset request failed.");
        }

        var wait = MinimumDuration - (DateTime.UtcNow - started);
        if (wait > TimeSpan.Zero)
            await Task.Delay(wait, ct);
    }

    private async Task RequestCoreAsync(string? email, string? locale, CancellationToken ct)
    {
        var address = email?.Trim();
        if (string.IsNullOrEmpty(address) || address.Length > 255)
            return;

        var lowered = address.ToLowerInvariant();
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Email.ToLower() == lowered && c.IsActive, ct);
        if (customer == null)
            return;

        var language = locale == "en" ? "en" : "uk";
        var site = OrderLinks.FrontendBase(_configuration);
        var message = new PasswordResetEmailMessage
        {
            ToEmail = customer.Email,
            Locale = language,
            SiteUrl = $"{site}/{language}",
        };

        if (HasPassword(customer))
        {
            var now = DateTime.UtcNow;
            var sentLastHour = await _context.PasswordResetTokens
                .CountAsync(t => t.CustomerId == customer.Id && t.CreatedAt > now.AddHours(-1), ct);
            if (sentLastHour >= MaxEmailsPerHour)
                return;

            // Earlier links keep working until they expire or one of them is used: if a new request
            // cancelled them, anyone who knows the address could keep cancelling the owner's own link.
            // What is a day old is gone.
            var stale = await _context.PasswordResetTokens
                .Where(t => t.CustomerId == customer.Id && t.CreatedAt < now.AddDays(-1))
                .ToListAsync(ct);
            _context.PasswordResetTokens.RemoveRange(stale);

            var raw = Base64Url(RandomNumberGenerator.GetBytes(32));
            _context.PasswordResetTokens.Add(new PasswordResetToken
            {
                CustomerId = customer.Id,
                TokenHash = HashToken(raw),
                ExpiresAt = now.Add(TokenLifetime),
                CreatedAt = now,
            });
            await _context.SaveChangesAsync(ct);

            message.ResetUrl = $"{site}/{language}/reset-password?token={raw}";
        }
        else if (!string.IsNullOrEmpty(customer.OAuthProvider))
        {
            if (OAuthMailSent.TryGetValue(customer.Id, out _))
                return;
            OAuthMailSent.Set(customer.Id, true, OAuthMailGap);
            message.OAuthProvider = string.Equals(customer.OAuthProvider, "apple", StringComparison.OrdinalIgnoreCase) ? "Apple" : "Google";
        }
        else
        {
            return;
        }

        // Like the order notices: the mail is sent in the background, so the request is not slower for a real account.
        EmailDispatched = Task.Run(async () =>
        {
            try
            {
                await _email.SendPasswordResetAsync(message, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Password reset email could not be sent.");
            }
        });
    }

    /// <summary>
    /// Sets a new password with a link's token and signs the customer in. Null when the token is unknown, used or expired
    /// (one answer for all three). The password must already satisfy <see cref="PasswordRules"/>.
    /// </summary>
    public async Task<AuthResponse?> ResetAsync(string? token, string newPassword, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 200)
            return null;

        var hash = HashToken(token.Trim());
        var now = DateTime.UtcNow;
        var row = await _context.PasswordResetTokens
            .Include(t => t.Customer)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (row == null || row.UsedAt != null || row.ExpiresAt <= now || !row.Customer.IsActive || !HasPassword(row.Customer))
            return null;

        // Single use even for two clicks at the same moment: only one request can flip UsedAt from null.
        if (_context.Database.IsRelational())
        {
            var claimed = await _context.PasswordResetTokens
                .Where(t => t.Id == row.Id && t.UsedAt == null && t.ExpiresAt > now)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedAt, now), ct);
            if (claimed != 1)
                return null;
        }
        else
        {
            row.UsedAt = now;
        }

        // Same hashing as registration.
        var customer = row.Customer;
        var salt = BCrypt.Net.BCrypt.GenerateSalt(12);
        customer.PasswordSalt = salt;
        customer.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, salt);

        // The customer's other open links die with this one.
        var otherLinks = await _context.PasswordResetTokens
            .Where(t => t.CustomerId == customer.Id && t.UsedAt == null && t.Id != row.Id)
            .ToListAsync(ct);
        foreach (var other in otherLinks)
            other.UsedAt = now;

        // Every other device is signed out.
        var sessions = await _context.RefreshTokens
            .Where(t => t.CustomerId == customer.Id && t.RevokedAtUtc == null)
            .ToListAsync(ct);
        foreach (var session in sessions)
            session.RevokedAtUtc = now;
        await _context.SaveChangesAsync(ct);

        var access = await _accessTokens.IssueAsync(customer, ct);
        await _refreshTokens.AttachNewRefreshAsync(access, ct);
        return access;
    }

    /// <summary>Deletes links that were used or expired more than a day ago. Returns how many.</summary>
    public static async Task<int> DeleteStaleAsync(YarneDbContext db, DateTime now, CancellationToken ct)
    {
        var cutoff = now.AddDays(-1);
        var stale = await db.PasswordResetTokens
            .Where(t => t.ExpiresAt < cutoff || (t.UsedAt != null && t.UsedAt < cutoff))
            .ToListAsync(ct);
        db.PasswordResetTokens.RemoveRange(stale);
        if (stale.Count > 0)
            await db.SaveChangesAsync(ct);
        return stale.Count;
    }

    private static bool HasPassword(Customer customer) =>
        !string.IsNullOrWhiteSpace(customer.PasswordHash)
        && customer.PasswordHash.StartsWith("$2", StringComparison.Ordinal);

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static string HashToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
