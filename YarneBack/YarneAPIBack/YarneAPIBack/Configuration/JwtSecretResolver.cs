namespace YarneAPIBack.Configuration;

/// <summary>
/// Resolves the JWT signing secret with an explicit priority so Railway variables
/// always win over committed appsettings values.
/// </summary>
public static class JwtSecretResolver
{
    public const string RailwayVariable = "Jwt__Secret";
    public const string LegacyVariable = "JWT_SECRET";

    public static (string Secret, string Source) Resolve(IConfiguration configuration)
    {
        var fromRailway = Environment.GetEnvironmentVariable(RailwayVariable)?.Trim();
        if (!string.IsNullOrEmpty(fromRailway))
            return (fromRailway, RailwayVariable);

        // ASP.NET binds Jwt__Secret env var into configuration["Jwt:Secret"].
        var fromConfig = configuration["Jwt:Secret"]?.Trim();
        if (!string.IsNullOrEmpty(fromConfig))
            return (fromConfig, "Jwt:Secret");

        // Legacy — lowest priority; delete JWT_SECRET on Railway if present.
        var fromLegacy = Environment.GetEnvironmentVariable(LegacyVariable)?.Trim();
        if (!string.IsNullOrEmpty(fromLegacy))
            return (fromLegacy, LegacyVariable);

        throw new InvalidOperationException(
            $"JWT secret is not configured. Set {RailwayVariable} in Railway environment variables.");
    }
}
