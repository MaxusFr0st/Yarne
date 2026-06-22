using YarneAPIBack.DTOs.Admin;

namespace YarneAPIBack.Services.Contracts;

public interface IAdminActivityLogService
{
    Task LogAsync(
        string category,
        string action,
        string summary,
        string? entityId = null,
        string? entityLabel = null,
        object? details = null,
        int? actorUserId = null,
        string? actorEmail = null,
        CancellationToken ct = default);

    Task<IReadOnlyList<AdminActivityLogDto>> GetLogsAsync(
        string? category = null,
        int limit = 100,
        int offset = 0,
        CancellationToken ct = default);
}
