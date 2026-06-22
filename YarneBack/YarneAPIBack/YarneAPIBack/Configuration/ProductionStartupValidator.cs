namespace YarneAPIBack.Configuration;

public static class ProductionStartupValidator
{
    public static void Validate(IHostEnvironment environment, JwtSettings jwtSettings)
    {
        if (!environment.IsProduction())
            return;

        if (string.IsNullOrWhiteSpace(jwtSettings.Secret)
            || jwtSettings.Secret.Length < 32
            || jwtSettings.Secret.Contains("SuperSecretKey", StringComparison.OrdinalIgnoreCase)
            || jwtSettings.Secret.Contains("Dev-SecretKey", StringComparison.OrdinalIgnoreCase)
            || jwtSettings.Secret.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Production JWT secret is missing or weak. Set Jwt__Secret (or JWT_SECRET) via Railway variables.");
        }
    }
}
