using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Color;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/furniture-colors")]
public class FurnitureColorsController : ControllerBase
{
    private readonly YarneDbContext _context;
    private readonly IAdminActivityLogService _activityLogs;

    public FurnitureColorsController(YarneDbContext context, IAdminActivityLogService activityLogs)
    {
        _context = context;
        _activityLogs = activityLogs;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<FurnitureColorDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<FurnitureColorDto>>> GetFurnitureColors(CancellationToken ct = default)
    {
        var colors = await _context.FurnitureColors
            .OrderBy(c => c.Name)
            .Select(c => new FurnitureColorDto
            {
                Id = c.Id,
                Name = c.Name,
                NameUk = c.NameUk,
                HexCode = c.HexCode,
            })
            .ToListAsync(ct);
        return Ok(colors);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(FurnitureColorDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FurnitureColorDto>> CreateFurnitureColor(
        [FromBody] CreateFurnitureColorRequest request,
        CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        if (await _context.FurnitureColors.AnyAsync(c => c.Name == request.Name, ct))
            return BadRequest(new { message = "Furniture color with this English name already exists" });

        var color = new Models.FurnitureColor
        {
            Name = request.Name.Trim(),
            NameUk = string.IsNullOrWhiteSpace(request.NameUk) ? null : request.NameUk.Trim(),
            HexCode = request.HexCode ?? "#2D241E",
        };
        _context.FurnitureColors.Add(color);
        await _context.SaveChangesAsync(ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "created",
            $"Created furniture color \"{color.Name}\"",
            color.Id.ToString(),
            color.Name,
            new { catalogType = "furnitureColor", color.Id, color.Name, color.NameUk, color.HexCode },
            actorUserId,
            actorEmail,
            ct);

        return Created($"/api/furniture-colors/{color.Id}", new FurnitureColorDto
        {
            Id = color.Id,
            Name = color.Name,
            NameUk = color.NameUk,
            HexCode = color.HexCode,
        });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(FurnitureColorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FurnitureColorDto>> UpdateFurnitureColor(
        int id,
        [FromBody] CreateFurnitureColorRequest request,
        CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        var color = await _context.FurnitureColors.FindAsync([id], ct);
        if (color == null) return NotFound();

        if (await _context.FurnitureColors.AnyAsync(c => c.Name == request.Name && c.Id != id, ct))
            return BadRequest(new { message = "Furniture color with this English name already exists" });

        var previousName = color.Name;
        color.Name = request.Name.Trim();
        color.NameUk = string.IsNullOrWhiteSpace(request.NameUk) ? null : request.NameUk.Trim();
        color.HexCode = request.HexCode ?? "#2D241E";
        await _context.SaveChangesAsync(ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "updated",
            $"Updated furniture color: {previousName} → {color.Name}",
            color.Id.ToString(),
            color.Name,
            new { catalogType = "furnitureColor", color.Id, previousName, newName = color.Name, color.NameUk, color.HexCode },
            actorUserId,
            actorEmail,
            ct);

        return Ok(new FurnitureColorDto
        {
            Id = color.Id,
            Name = color.Name,
            NameUk = color.NameUk,
            HexCode = color.HexCode,
        });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult> DeleteFurnitureColor(int id, CancellationToken ct = default)
    {
        var color = await _context.FurnitureColors.FindAsync([id], ct);
        if (color == null) return NotFound();

        var name = color.Name;
        var affectedProductNames = await _context.ProductFurnitureColors
            .Where(pc => pc.FurnitureColorId == id)
            .Select(pc => pc.Product.Name)
            .Distinct()
            .OrderBy(n => n)
            .ToListAsync(ct);

        var productsWithDefault = await _context.Products
            .Where(p => p.DefaultFurnitureColorId == id)
            .ToListAsync(ct);
        foreach (var product in productsWithDefault)
            product.DefaultFurnitureColorId = null;

        _context.FurnitureColors.Remove(color);

        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            var productHint = affectedProductNames.Count > 0
                ? $" It is assigned to: {string.Join(", ", affectedProductNames)}."
                : string.Empty;
            return Conflict(new
            {
                message = $"Cannot delete furniture color \"{name}\" because it is still in use.{productHint}",
                products = affectedProductNames,
            });
        }

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "deleted",
            $"Deleted furniture color \"{name}\"",
            id.ToString(),
            name,
            new { catalogType = "furnitureColor", id, name, affectedProductNames },
            actorUserId,
            actorEmail,
            ct);

        return NoContent();
    }
}
