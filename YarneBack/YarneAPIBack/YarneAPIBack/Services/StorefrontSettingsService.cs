using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class StorefrontSettingsService : IStorefrontSettingsService
{
    public static readonly IReadOnlySet<string> AllowedKeys = new HashSet<string>(StringComparer.Ordinal)
    {
        "yarne.carousel.productCodes.v1",
        "yarne.featuredShowcase.v1",
        "yarne.home.sections.v1",
        "yarne.home.media.v1",
        "yarne.home.copy.v1",
        "yarne.staticPages.v1",
        "yarne.product.guarantee.v1",
    };

    private readonly YarneDbContext _context;

    public StorefrontSettingsService(YarneDbContext context)
    {
        _context = context;
    }

    public bool IsAllowedKey(string key) => AllowedKeys.Contains(key);

    public async Task<string?> GetValueJsonAsync(string key, CancellationToken ct = default)
    {
        if (!IsAllowedKey(key))
            return null;

        var row = await _context.AppSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == key, ct);

        return row?.ValueJson;
    }

    public async Task<string> UpsertValueJsonAsync(string key, string valueJson, CancellationToken ct = default)
    {
        if (!IsAllowedKey(key))
            throw new ArgumentException("Unsupported storefront setting key.", nameof(key));

        var existing = await _context.AppSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (existing == null)
        {
            existing = new AppSetting { Key = key };
            _context.AppSettings.Add(existing);
        }

        existing.ValueJson = valueJson;
        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return existing.ValueJson;
    }
}
