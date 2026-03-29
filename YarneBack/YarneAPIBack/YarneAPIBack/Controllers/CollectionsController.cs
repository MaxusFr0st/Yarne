using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CollectionsController : ControllerBase
{
    private readonly YarneDbContext _context;

    public CollectionsController(YarneDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<object>>> GetCollections(CancellationToken ct = default)
    {
        var collections = await _context.Collections
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.StartDate, c.EndDate })
            .ToListAsync(ct);

        return Ok(collections);
    }
}
