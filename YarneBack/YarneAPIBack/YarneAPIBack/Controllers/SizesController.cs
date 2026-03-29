using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Size;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SizesController : ControllerBase
{
    private readonly YarneDbContext _context;

    public SizesController(YarneDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SizeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SizeDto>>> GetSizes(CancellationToken ct = default)
    {
        var sizes = await _context.Sizes
            .OrderBy(s => s.Name)
            .Select(s => new SizeDto { Id = s.Id, Name = s.Name })
            .ToListAsync(ct);

        return Ok(sizes);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(SizeDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SizeDto>> CreateSize([FromBody] CreateSizeRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        var normalized = request.Name.Trim();
        if (await _context.Sizes.AnyAsync(s => s.Name == normalized, ct))
            return BadRequest(new { message = "Size with this name already exists" });

        var size = new Models.Size { Name = normalized };
        _context.Sizes.Add(size);
        await _context.SaveChangesAsync(ct);

        return Created($"/api/sizes/{size.Id}", new SizeDto { Id = size.Id, Name = size.Name });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(SizeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SizeDto>> UpdateSize(int id, [FromBody] CreateSizeRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        var size = await _context.Sizes.FindAsync([id], ct);
        if (size == null) return NotFound();

        var normalized = request.Name.Trim();
        if (await _context.Sizes.AnyAsync(s => s.Name == normalized && s.Id != id, ct))
            return BadRequest(new { message = "Size with this name already exists" });

        size.Name = normalized;
        await _context.SaveChangesAsync(ct);
        return Ok(new SizeDto { Id = size.Id, Name = size.Name });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteSize(int id, CancellationToken ct = default)
    {
        var size = await _context.Sizes.FindAsync([id], ct);
        if (size == null) return NotFound();

        _context.Sizes.Remove(size);
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }
}
