namespace YarneAPIBack.Configuration;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = null!;

    public string Issuer { get; set; } = "YarneAPI";

    public string Audience { get; set; } = "YarneApp";

    /// <summary>Legacy fallback when <see cref="CustomerExpiration"/> is not set.</summary>
    public TimeSpan Expiration { get; set; } = TimeSpan.FromMinutes(45);

    public TimeSpan AdminExpiration { get; set; } = TimeSpan.FromMinutes(120);

    public TimeSpan CustomerExpiration { get; set; } = TimeSpan.FromMinutes(45);

    /// <summary>Sliding refresh-cookie lifetime (re-issued on each successful /refresh).</summary>
    public TimeSpan RefreshExpiration { get; set; } = TimeSpan.FromDays(14);

    public TimeSpan GetExpirationForRole(string roleName) =>
        string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase)
            ? AdminExpiration
            : CustomerExpiration > TimeSpan.Zero ? CustomerExpiration : Expiration;
}
