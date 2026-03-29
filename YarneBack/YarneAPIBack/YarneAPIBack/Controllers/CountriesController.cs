using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Country;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CountriesController : ControllerBase
{
    private readonly YarneDbContext _context;

    public CountriesController(YarneDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<object>>> GetCountries(CancellationToken ct = default)
    {
        var countries = await _context.Countries
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(ct);

        return Ok(countries);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<object>> CreateCountry([FromBody] CreateCountryRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        if (await _context.Countries.AnyAsync(c => c.Name == request.Name, ct))
            return BadRequest(new { message = "Country with this name already exists" });

        var country = new Models.Country { Name = request.Name };
        _context.Countries.Add(country);
        await _context.SaveChangesAsync(ct);
        return Created($"/api/countries/{country.Id}", new { id = country.Id, name = country.Name });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> UpdateCountry(int id, [FromBody] CreateCountryRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        var country = await _context.Countries.FindAsync([id], ct);
        if (country == null) return NotFound();

        if (await _context.Countries.AnyAsync(c => c.Name == request.Name && c.Id != id, ct))
            return BadRequest(new { message = "Country with this name already exists" });

        country.Name = request.Name;
        await _context.SaveChangesAsync(ct);
        return Ok(new { id = country.Id, name = country.Name });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteCountry(int id, CancellationToken ct = default)
    {
        var country = await _context.Countries.FindAsync([id], ct);
        if (country == null) return NotFound();

        _context.Countries.Remove(country);
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }
}
