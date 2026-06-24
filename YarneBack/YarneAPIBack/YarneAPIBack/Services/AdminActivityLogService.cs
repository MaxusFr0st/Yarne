using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Admin;
using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class AdminActivityLogService : IAdminActivityLogService
{
    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "product", "user", "push", "order", "catalog", "image", "accounting",
    };

    private readonly YarneDbContext _context;

    public AdminActivityLogService(YarneDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(
        string category,
        string action,
        string summary,
        string? entityId = null,
        string? entityLabel = null,
        object? details = null,
        int? actorUserId = null,
        string? actorEmail = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(category) || string.IsNullOrWhiteSpace(action) || string.IsNullOrWhiteSpace(summary))
            return;

        var normalizedCategory = category.Trim().ToLowerInvariant();
        if (!AllowedCategories.Contains(normalizedCategory))
            return;

        var entry = new AdminActivityLog
        {
            Category = normalizedCategory,
            Action = action.Trim().ToLowerInvariant(),
            EntityId = string.IsNullOrWhiteSpace(entityId) ? null : entityId.Trim(),
            EntityLabel = string.IsNullOrWhiteSpace(entityLabel) ? null : entityLabel.Trim(),
            Summary = summary.Trim(),
            DetailsJson = details == null ? null : JsonSerializer.Serialize(details),
            ActorUserId = actorUserId,
            ActorEmail = string.IsNullOrWhiteSpace(actorEmail) ? null : actorEmail.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _context.AdminActivityLogs.Add(entry);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AdminActivityLogDto>> GetLogsAsync(
        string? category = null,
        int limit = 100,
        int offset = 0,
        CancellationToken ct = default)
    {
        var safeLimit = Math.Clamp(limit, 1, 500);
        var safeOffset = Math.Max(0, offset);

        var query = _context.AdminActivityLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalized = category.Trim().ToLowerInvariant();
            if (AllowedCategories.Contains(normalized))
                query = query.Where(l => l.Category == normalized);
        }

        var rows = await query
            .OrderByDescending(l => l.CreatedAt)
            .ThenByDescending(l => l.Id)
            .Skip(safeOffset)
            .Take(safeLimit)
            .ToListAsync(ct);

        return rows.Select(Map).ToList();
    }

    private static AdminActivityLogDto Map(AdminActivityLog l) => new()
    {
        Id = l.Id,
        Category = l.Category,
        Action = l.Action,
        EntityId = l.EntityId,
        EntityLabel = l.EntityLabel,
        Summary = l.Summary,
        DetailsJson = l.DetailsJson,
        ActorUserId = l.ActorUserId,
        ActorEmail = l.ActorEmail,
        CreatedAt = l.CreatedAt,
    };
}
