using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.DTOs.Admin;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/admin/activity-logs")]
[Authorize(Roles = "Admin")]
public class AdminActivityLogsController : ControllerBase
{
    private readonly IAdminActivityLogService _logs;

    public AdminActivityLogsController(IAdminActivityLogService logs)
    {
        _logs = logs;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AdminActivityLogDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AdminActivityLogDto>>> GetLogs(
        [FromQuery] string? category = null,
        [FromQuery] int limit = 100,
        [FromQuery] int offset = 0,
        CancellationToken ct = default)
    {
        var rows = await _logs.GetLogsAsync(category, limit, offset, ct);
        return Ok(rows);
    }
}
