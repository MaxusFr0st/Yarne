namespace YarneAPIBack.Models;

public class AdminActivityLog
{
    public int Id { get; set; }

    /// <summary>product | user | push</summary>
    public string Category { get; set; } = null!;

    /// <summary>created | updated | deleted | published</summary>
    public string Action { get; set; } = null!;

    public string? EntityId { get; set; }

    public string? EntityLabel { get; set; }

    public string Summary { get; set; } = null!;

    public string? DetailsJson { get; set; }

    public int? ActorUserId { get; set; }

    public string? ActorEmail { get; set; }

    public DateTime CreatedAt { get; set; }
}
