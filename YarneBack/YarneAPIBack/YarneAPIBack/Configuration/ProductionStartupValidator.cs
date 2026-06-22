namespace YarneAPIBack.Configuration;

public static class ProductionStartupValidator
{
    // Known weak or dev-committed secrets that must never be used in production.
    private static readonly string[] BlockedSecretFragments =
    [
        "SuperSecretKey",
        "Dev-SecretKey",
        "CHANGE_ME",
        // Default secret committed in appsettings.json — anyone who cloned the repo has this value.
        "6I12HRJxOaJg",
    ];

    public static void Validate(IHostEnvironment environment, JwtSettings jwtSettings)
    {
        if (!environment.IsProduction())
            return;

        if (string.IsNullOrWhiteSpace(jwtSettings.Secret) || jwtSettings.Secret.Length < 32)
            throw new InvalidOperationException(
                "Production JWT secret is missing or too short (minimum 32 characters). " +
                "Set Jwt__Secret via Railway environment variables.");

        foreach (var blocked in BlockedSecretFragments)
        {
            if (jwtSettings.Secret.Contains(blocked, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    "Production JWT secret matches a known dev or committed value and cannot be used. " +
                    "Generate a new secret and set it via Jwt__Secret in Railway environment variables.");
        }
    }
}
