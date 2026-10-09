namespace YarneAPIBack.Services;

/// <summary>The one password rule: registration and password reset both use it.</summary>
public static class PasswordRules
{
    public const string Pattern = @"^(?=.*[A-Z])(?=.*\d).{8,}$";

    public const string Message = "Password must be at least 8 characters and include one uppercase letter and one digit";

    public const int MaxLength = 100;

    public static bool IsValid(string? password) =>
        !string.IsNullOrEmpty(password)
        && password.Length <= MaxLength
        && System.Text.RegularExpressions.Regex.IsMatch(password, Pattern);
}
