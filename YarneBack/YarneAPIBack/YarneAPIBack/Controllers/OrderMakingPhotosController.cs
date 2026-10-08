using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

/// <summary>
/// The customer's side of the making-of photos. Everything here needs a signed-in customer who owns the order: the status link
/// (token) alone is not enough to see a photo, and no photo has a public URL.
/// </summary>
[ApiController]
[Route("api/orders/status/{token}/photos")]
[Authorize]
[EnableRateLimiting("order-status")]
public class OrderMakingPhotosController : ControllerBase
{
    private readonly YarneDbContext _context;
    private readonly IR2ImageStorageService _storage;

    public OrderMakingPhotosController(YarneDbContext context, IR2ImageStorageService storage)
    {
        _context = context;
        _storage = storage;
    }

    /// <summary>The photos of the order (ids and dates). 403 for anyone but the account that owns the order; the page uses this to tell the owner from another account.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(MakingPhotosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MakingPhotosDto>> List(string token, CancellationToken ct = default)
    {
        var (order, error) = await FindOwnedAsync(token, ct);
        if (order == null)
            return error!;

        var photos = await _context.OrderMakingPhotos.AsNoTracking().Where(p => p.OrderId == order.Id).OrderBy(p => p.CreatedAt).ThenBy(p => p.Id).ToListAsync(ct);
        return Ok(new MakingPhotosDto
        {
            RequestedAt = order.PhotosRequestedAt,
            Photos = photos.Select(p => new MakingPhotoDto { Id = p.Id, CreatedAt = p.CreatedAt }).ToList(),
        });
    }

    /// <summary>"Request photos": once per order, while it is being made. Asking again changes nothing.</summary>
    [HttpPost("request")]
    [EnableRateLimiting("order-receipt")]
    [ProducesResponseType(typeof(MakingPhotosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MakingPhotosDto>> Request(string token, CancellationToken ct = default)
    {
        var (order, error) = await FindOwnedAsync(token, ct);
        if (order == null)
            return error!;

        if (order.PhotosRequestedAt == null)
        {
            if (!MakingPhotos.IsMakingStage(order.Status))
                return Conflict(new { message = "Photos can only be requested while the order is being made." });
            order.PhotosRequestedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }

        return await List(token, ct);
    }

    /// <summary>One photo, streamed to the owner only. Never cached.</summary>
    [HttpGet("{photoId:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Image(string token, int photoId, CancellationToken ct = default)
    {
        var (order, error) = await FindOwnedAsync(token, ct);
        if (order == null)
            return error!;
        var photo = await _context.OrderMakingPhotos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == photoId && p.OrderId == order.Id, ct);
        if (photo == null)
            return NotFound();
        var file = await _storage.GetPrivateAsync(photo.StorageKey, ct);
        if (file == null)
            return NotFound();

        Response.Headers.CacheControl = "private, no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(file.Value.Content, file.Value.ContentType);
    }

    private async Task<(Models.Order? Order, ActionResult? Error)> FindOwnedAsync(string token, CancellationToken ct)
    {
        if (!OrderPublicIdentifiers.LooksLikeStatusToken(token))
            return (null, NotFound());

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.StatusToken == token && !o.IsVoid, ct);
        if (order == null)
            return (null, NotFound());

        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(ClaimTypes.Sid) ?? User.FindFirstValue("sub");
        if (!int.TryParse(raw, out var customerId) || order.CustomerId != customerId)
            return (null, StatusCode(StatusCodes.Status403Forbidden));
        return (order, null);
    }
}
