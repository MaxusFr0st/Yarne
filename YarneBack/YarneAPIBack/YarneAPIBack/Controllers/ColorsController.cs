using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Color;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ColorsController : ControllerBase
{
    private readonly YarneDbContext _context;
    private readonly IAdminActivityLogService _activityLogs;

    public ColorsController(YarneDbContext context, IAdminActivityLogService activityLogs)
    {
        _context = context;
        _activityLogs = activityLogs;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ColorDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ColorDto>>> GetColors(CancellationToken ct = default)
    {
        var colors = await _context.Colors
            .OrderBy(c => c.Name)
            .Select(c => new ColorDto { Id = c.Id, Name = c.Name, HexCode = c.HexCode })
            .ToListAsync(ct);
        return Ok(colors);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ColorDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ColorDto>> CreateColor([FromBody] CreateColorRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        if (await _context.Colors.AnyAsync(c => c.Name == request.Name, ct))
            return BadRequest(new { message = "Color with this name already exists" });

        var color = new Models.Color { Name = request.Name, HexCode = request.HexCode ?? "#2D241E" };
        _context.Colors.Add(color);
        await _context.SaveChangesAsync(ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "created",
            $"Created color \"{color.Name}\"",
            color.Id.ToString(),
            color.Name,
            new { catalogType = "color", color.Id, color.Name, color.HexCode },
            actorUserId,
            actorEmail,
            ct);

        return Created($"/api/colors/{color.Id}", new ColorDto { Id = color.Id, Name = color.Name, HexCode = color.HexCode });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ColorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ColorDto>> UpdateColor(int id, [FromBody] CreateColorRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        var color = await _context.Colors.FindAsync([id], ct);
        if (color == null) return NotFound();

        if (await _context.Colors.AnyAsync(c => c.Name == request.Name && c.Id != id, ct))
            return BadRequest(new { message = "Color with this name already exists" });

        var previousName = color.Name;
        var previousHex = color.HexCode;
        color.Name = request.Name;
        color.HexCode = request.HexCode ?? "#2D241E";
        await _context.SaveChangesAsync(ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "updated",
            $"Updated color: {previousName} → {color.Name}",
            color.Id.ToString(),
            color.Name,
            new
            {
                catalogType = "color",
                color.Id,
                previousName,
                newName = color.Name,
                previousHex,
                newHex = color.HexCode,
            },
            actorUserId,
            actorEmail,
            ct);

        return Ok(new ColorDto { Id = color.Id, Name = color.Name, HexCode = color.HexCode });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteColor(int id, CancellationToken ct = default)
    {
        var color = await _context.Colors.FindAsync([id], ct);
        if (color == null) return NotFound();

        var name = color.Name;
        _context.Colors.Remove(color);
        await _context.SaveChangesAsync(ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "deleted",
            $"Deleted color \"{name}\"",
            id.ToString(),
            name,
            new { catalogType = "color", id, name },
            actorUserId,
            actorEmail,
            ct);

        return NoContent();
    }
}
