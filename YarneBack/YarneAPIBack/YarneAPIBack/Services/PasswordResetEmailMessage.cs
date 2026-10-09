namespace YarneAPIBack.Services;

public class PasswordResetEmailMessage
{
    public string ToEmail { get; set; } = string.Empty;

    /// <summary>"en" or "uk".</summary>
    public string Locale { get; set; } = "uk";

    /// <summary>{site}/{locale}/reset-password?token=...: the emailed link. Empty for an account that signs in with Google or Apple.</summary>
    public string ResetUrl { get; set; } = string.Empty;

    /// <summary>The site's home page in the email's language: the only button of the Google/Apple variant.</summary>
    public string SiteUrl { get; set; } = string.Empty;

    /// <summary>"Google" or "Apple" when the account has no password because it was made through that sign-in; null for a normal reset.</summary>
    public string? OAuthProvider { get; set; }
}
