using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Collection;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CollectionsController : ControllerBase
{
    private readonly YarneDbContext _context;
    private readonly IAdminActivityLogService _activityLogs;

    public CollectionsController(YarneDbContext context, IAdminActivityLogService activityLogs)
    {
        _context = context;
        _activityLogs = activityLogs;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<object>>> GetCollections(CancellationToken ct = default)
    {
        var collections = await _context.Collections
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                StartDate = c.StartDate.HasValue ? c.StartDate.Value.ToString("O") : null,
                EndDate = c.EndDate.HasValue ? c.EndDate.Value.ToString("O") : null,
                ProductCount = c.Products.Count(p => p.IsActive),
            })
            .ToListAsync(ct);

        return Ok(collections);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> GetCollection(int id, CancellationToken ct = default)
    {
        var collection = await _context.Collections
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new
            {
                c.Id,
                c.Name,
                StartDate = c.StartDate.HasValue ? c.StartDate.Value.ToString("O") : null,
                EndDate = c.EndDate.HasValue ? c.EndDate.Value.ToString("O") : null,
                ProductIds = c.Products.Select(p => p.Id).ToList(),
            })
            .FirstOrDefaultAsync(ct);

        if (collection == null)
            return NotFound();

        return Ok(collection);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<object>> CreateCollection([FromBody] CreateCollectionRequest request, CancellationToken ct = default)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Collection name is required." });

        var name = request.Name.Trim();
        if (await _context.Collections.AnyAsync(c => c.Name == name, ct))
            return BadRequest(new { message = "Collection with this name already exists." });

        var collection = new Models.Collection
        {
            Name = name,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
        };
        _context.Collections.Add(collection);
        await _context.SaveChangesAsync(ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "created",
            $"Created collection \"{collection.Name}\"",
            collection.Id.ToString(),
            collection.Name,
            new { catalogType = "collection", collection.Id, collection.Name },
            actorUserId,
            actorEmail,
            ct);

        return Created($"/api/collections/{collection.Id}", new
        {
            id = collection.Id,
            name = collection.Name,
            startDate = collection.StartDate?.ToString("O"),
            endDate = collection.EndDate?.ToString("O"),
            productCount = 0,
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> UpdateCollection(int id, [FromBody] CreateCollectionRequest request, CancellationToken ct = default)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Collection name is required." });

        var collection = await _context.Collections.FindAsync([id], ct);
        if (collection == null)
            return NotFound();

        var name = request.Name.Trim();
        if (await _context.Collections.AnyAsync(c => c.Name == name && c.Id != id, ct))
            return BadRequest(new { message = "Collection with this name already exists." });

        var previousName = collection.Name;
        collection.Name = name;
        collection.StartDate = request.StartDate;
        collection.EndDate = request.EndDate;
        await _context.SaveChangesAsync(ct);

        var productCount = await _context.Products.CountAsync(p => p.CollectionId == id && p.IsActive, ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "updated",
            $"Updated collection: {previousName} → {collection.Name}",
            collection.Id.ToString(),
            collection.Name,
            new { catalogType = "collection", collection.Id, previousName, newName = collection.Name },
            actorUserId,
            actorEmail,
            ct);

        return Ok(new
        {
            id = collection.Id,
            name = collection.Name,
            startDate = collection.StartDate?.ToString("O"),
            endDate = collection.EndDate?.ToString("O"),
            productCount,
        });
    }

    [HttpPut("{id:int}/products")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> SetCollectionProducts(int id, [FromBody] SetCollectionProductsRequest request, CancellationToken ct = default)
    {
        var collection = await _context.Collections.FindAsync([id], ct);
        if (collection == null)
            return NotFound();

        var requestedIds = (request?.ProductIds ?? new List<int>()).Distinct().ToList();

        var existingProducts = await _context.Products
            .Where(p => p.CollectionId == id)
            .ToListAsync(ct);

        foreach (var product in existingProducts)
            product.CollectionId = null;

        if (requestedIds.Count > 0)
        {
            var productsToAssign = await _context.Products
                .Where(p => requestedIds.Contains(p.Id))
                .ToListAsync(ct);

            foreach (var product in productsToAssign)
                product.CollectionId = id;
        }

        await _context.SaveChangesAsync(ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "updated",
            $"Updated products in collection \"{collection.Name}\" ({requestedIds.Count} items)",
            collection.Id.ToString(),
            collection.Name,
            new { catalogType = "collection", collection.Id, collection.Name, productCount = requestedIds.Count },
            actorUserId,
            actorEmail,
            ct);

        return Ok(new
        {
            id = collection.Id,
            name = collection.Name,
            startDate = collection.StartDate?.ToString("O"),
            endDate = collection.EndDate?.ToString("O"),
            productIds = requestedIds,
        });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteCollection(int id, CancellationToken ct = default)
    {
        var collection = await _context.Collections.FindAsync([id], ct);
        if (collection == null)
            return NotFound();

        var name = collection.Name;

        var products = await _context.Products.Where(p => p.CollectionId == id).ToListAsync(ct);
        foreach (var product in products)
            product.CollectionId = null;

        _context.Collections.Remove(collection);
        await _context.SaveChangesAsync(ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "catalog",
            "deleted",
            $"Deleted collection \"{name}\"",
            id.ToString(),
            name,
            new { catalogType = "collection", id, name },
            actorUserId,
            actorEmail,
            ct);

        return NoContent();
    }
}
