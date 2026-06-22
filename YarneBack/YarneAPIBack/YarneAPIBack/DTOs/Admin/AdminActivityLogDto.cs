namespace YarneAPIBack.DTOs.Admin;

public class AdminActivityLogDto
{
    public int Id { get; set; }
    public string Category { get; set; } = null!;
    public string Action { get; set; } = null!;
    public string? EntityId { get; set; }
    public string? EntityLabel { get; set; }
    public string Summary { get; set; } = null!;
    public string? DetailsJson { get; set; }
    public int? ActorUserId { get; set; }
    public string? ActorEmail { get; set; }
    public DateTime CreatedAt { get; set; }
}
