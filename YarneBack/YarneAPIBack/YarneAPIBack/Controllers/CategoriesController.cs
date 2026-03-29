using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Category;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly YarneDbContext _context;

    public CategoriesController(YarneDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<object>>> GetCategories(CancellationToken ct = default)
    {
        var categories = await _context.Categories
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(ct);

        return Ok(categories);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<object>> CreateCategory([FromBody] CreateCategoryRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        if (await _context.Categories.AnyAsync(c => c.Name == request.Name, ct))
            return BadRequest(new { message = "Category with this name already exists" });

        var category = new Models.Category { Name = request.Name };
        _context.Categories.Add(category);
        await _context.SaveChangesAsync(ct);
        return Created($"/api/categories/{category.Id}", new { id = category.Id, name = category.Name });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> UpdateCategory(int id, [FromBody] CreateCategoryRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        var category = await _context.Categories.FindAsync([id], ct);
        if (category == null) return NotFound();

        if (await _context.Categories.AnyAsync(c => c.Name == request.Name && c.Id != id, ct))
            return BadRequest(new { message = "Category with this name already exists" });

        category.Name = request.Name;
        await _context.SaveChangesAsync(ct);
        return Ok(new { id = category.Id, name = category.Name });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteCategory(int id, CancellationToken ct = default)
    {
        var category = await _context.Categories.FindAsync([id], ct);
        if (category == null) return NotFound();

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }
}
