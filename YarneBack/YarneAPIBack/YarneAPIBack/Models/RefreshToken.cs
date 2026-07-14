namespace YarneAPIBack.Models;

/// <summary>Server-side refresh session. Only a SHA-256 hash of the cookie value is stored.</summary>
public class RefreshToken
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public string TokenHash { get; set; } = null!;

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? RevokedAtUtc { get; set; }

    public int? ReplacedByTokenId { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual RefreshToken? ReplacedByToken { get; set; }
}
