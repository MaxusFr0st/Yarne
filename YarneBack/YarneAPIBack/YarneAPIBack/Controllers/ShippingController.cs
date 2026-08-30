using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using YarneAPIBack.DTOs.Shipping;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

/// <summary>
/// First-party mirror of Nova Poshta's city/warehouse lists, so the storefront's offline
/// delivery picker has a same-origin, cacheable data source instead of depending on their
/// cross-origin widget (which cannot work offline at all).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ShippingController : ControllerBase
{
    private const string CitiesCacheKey = "shipping:cities";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

    private readonly INovaPoshtaService _novaPoshta;
    private readonly IMemoryCache _cache;

    public ShippingController(INovaPoshtaService novaPoshta, IMemoryCache cache)
    {
        _novaPoshta = novaPoshta;
        _cache = cache;
    }

    [HttpGet("cities")]
    [ProducesResponseType(typeof(IEnumerable<CityDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CityDto>>> GetCities(CancellationToken ct = default)
    {
        var cities = await _cache.GetOrCreateAsync(CitiesCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            var result = await _novaPoshta.GetCitiesAsync(ct);
            return result.Select(c => new CityDto { Ref = c.Ref, Name = c.Name }).ToList();
        });

        return Ok(cities);
    }

    [HttpGet("warehouses")]
    [ProducesResponseType(typeof(IEnumerable<WarehouseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IEnumerable<WarehouseDto>>> GetWarehouses(
        [FromQuery] string cityRef,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(cityRef))
            return BadRequest(new { message = "cityRef is required." });

        var cacheKey = $"shipping:warehouses:{cityRef}";
        var warehouses = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            var result = await _novaPoshta.GetWarehousesAsync(cityRef, ct);
            return result.Select(w => new WarehouseDto
            {
                Ref = w.Ref,
                CityRef = w.CityRef,
                Description = w.Description,
                ShortAddress = w.ShortAddress,
                Number = w.Number,
            }).ToList();
        });

        return Ok(warehouses);
    }
}
