namespace YarneAPIBack.Configuration;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = null!;

    public string Issuer { get; set; } = "YarneAPI";

    public string Audience { get; set; } = "YarneApp";

    public TimeSpan Expiration { get; set; } = TimeSpan.FromHours(24);
}
