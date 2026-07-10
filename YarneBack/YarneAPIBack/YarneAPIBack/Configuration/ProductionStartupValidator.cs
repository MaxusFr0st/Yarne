namespace YarneAPIBack.Configuration;

public static class ProductionStartupValidator
{
    private static readonly string[] BlockedSecretFragments =
    [
        "SuperSecretKey",
        "Dev-SecretKey",
        "CHANGE_ME",
        "DEV_SECRET_REPLACE",
        "6I12HRJxOaJg",
    ];

    public static void Validate(IHostEnvironment environment, JwtSettings jwtSettings)
    {
        if (!environment.IsProduction())
            return;

        if (string.IsNullOrWhiteSpace(jwtSettings.Secret) || jwtSettings.Secret.Length < 32)
        {
            throw new InvalidOperationException(
                "Production JWT secret is missing or too short. Set Jwt__Secret (or JWT_SECRET) via Railway variables.");
        }

        foreach (var blocked in BlockedSecretFragments)
        {
            if (jwtSettings.Secret.Contains(blocked, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Production JWT secret matches a known dev or committed value and cannot be used. " +
                    "Generate a new secret (openssl rand -base64 48) and set Jwt__Secret in Railway.");
            }
        }

        ValidateAdminSeedCredentials();
    }

    private static void ValidateAdminSeedCredentials()
    {
        var seedEmail = Environment.GetEnvironmentVariable("APP_SEED_ADMIN_EMAIL");
        var seedPassword = Environment.GetEnvironmentVariable("APP_SEED_ADMIN_PASSWORD");

        var hasEmail = !string.IsNullOrWhiteSpace(seedEmail);
        var hasPassword = !string.IsNullOrWhiteSpace(seedPassword);

        if (hasEmail && !hasPassword)
            throw new InvalidOperationException(
                "APP_SEED_ADMIN_EMAIL is set but APP_SEED_ADMIN_PASSWORD is missing. " +
                "Both must be set together or both must be absent.");

        if (hasPassword && !hasEmail)
            throw new InvalidOperationException(
                "APP_SEED_ADMIN_PASSWORD is set but APP_SEED_ADMIN_EMAIL is missing. " +
                "Both must be set together or both must be absent.");

        if (hasPassword && seedPassword!.Length < 12)
            throw new InvalidOperationException(
                "APP_SEED_ADMIN_PASSWORD must be at least 12 characters long.");
    }
}
