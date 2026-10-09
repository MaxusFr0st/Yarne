namespace YarneAPIBack.Models;

/// <summary>A "forgot password" link. Only a SHA-256 hash of the token in the emailed link is stored; it works once, for 30 minutes.</summary>
public class PasswordResetToken
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public string TokenHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime? UsedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Customer Customer { get; set; } = null!;
}
