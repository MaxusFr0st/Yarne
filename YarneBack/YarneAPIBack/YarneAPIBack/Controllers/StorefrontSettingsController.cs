using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/storefront-settings")]
public class StorefrontSettingsController : ControllerBase
{
    private readonly IStorefrontSettingsService _settings;

    public StorefrontSettingsController(IStorefrontSettingsService settings)
    {
        _settings = settings;
    }

    [HttpGet("{key}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> Get(string key, CancellationToken ct = default)
    {
        if (!_settings.IsAllowedKey(key))
            return NotFound();

        var valueJson = await _settings.GetValueJsonAsync(key, ct);
        if (valueJson == null)
            return NotFound();

        return Ok(new { key, value = ParseJson(valueJson) });
    }

    [HttpPut("{key}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<object>> Put(string key, [FromBody] JsonElement value, CancellationToken ct = default)
    {
        if (!_settings.IsAllowedKey(key))
            return BadRequest(new { message = "Unsupported storefront setting key." });

        var valueJson = value.GetRawText();
        if (valueJson.Length > 256_000)
            return BadRequest(new { message = "Setting payload is too large." });

        var saved = await _settings.UpsertValueJsonAsync(key, valueJson, ct);
        return Ok(new { key, value = ParseJson(saved) });
    }

    private static object? ParseJson(string valueJson)
    {
        try
        {
            return JsonSerializer.Deserialize<JsonElement>(valueJson);
        }
        catch
        {
            return valueJson;
        }
    }
}
