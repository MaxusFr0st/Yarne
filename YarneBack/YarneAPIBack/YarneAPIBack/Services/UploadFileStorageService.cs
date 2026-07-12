using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public partial class UploadFileStorageService : IUploadFileStorageService
{
    private static readonly Regex UploadPathRegex = UploadPathPattern();

    private readonly YarneDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<UploadFileStorageService> _logger;

    public UploadFileStorageService(
        YarneDbContext context,
        IWebHostEnvironment env,
        ILogger<UploadFileStorageService> logger)
    {
        _context = context;
        _env = env;
        _logger = logger;
    }

    public string? NormalizeUploadPath(string? url) => MediaUrlNormalizer.NormalizeForStorage(url);

    public bool TryResolveLocalPath(string uploadPath, out string filePath)
    {
        filePath = string.Empty;
        var normalized = NormalizeUploadPath(uploadPath);
        if (string.IsNullOrWhiteSpace(normalized))
            return false;

        var fileName = Path.GetFileName(normalized);
        if (string.IsNullOrEmpty(fileName) || fileName.Contains("..", StringComparison.Ordinal))
            return false;

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        filePath = Path.Combine(webRoot, "uploads", fileName);
        return true;
    }

    public async Task<bool> TryDeleteIfUnreferencedAsync(string? url, CancellationToken ct = default)
    {
        var normalized = NormalizeUploadPath(url);
        if (string.IsNullOrWhiteSpace(normalized))
            return false;

        if (await IsReferencedAsync(normalized, ct))
            return false;

        if (!TryResolveLocalPath(normalized, out var filePath))
            return false;

        if (!File.Exists(filePath))
            return true;

        try
        {
            File.Delete(filePath);
            _logger.LogInformation("Deleted unreferenced upload {UploadPath}", normalized);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete upload file {FilePath}", filePath);
            return false;
        }
    }

    public async Task DeleteRemovedIfUnreferencedAsync(
        IEnumerable<string?> previousUrls,
        IEnumerable<string?> nextUrls,
        CancellationToken ct = default)
    {
        var previous = CollectNormalizedPaths(previousUrls);
        var next = new HashSet<string>(CollectNormalizedPaths(nextUrls), StringComparer.OrdinalIgnoreCase);

        foreach (var removed in previous)
        {
            if (next.Contains(removed))
                continue;

            await TryDeleteIfUnreferencedAsync(removed, ct);
        }
    }

    public IReadOnlyList<string> ExtractUploadPathsFromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return Array.Empty<string>();

        var matches = UploadPathRegex.Matches(json);
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in matches)
        {
            if (match.Success)
                paths.Add(match.Value);
        }

        return paths.ToList();
    }

    private static List<string> CollectNormalizedPaths(IEnumerable<string?> urls)
    {
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in urls)
        {
            var normalized = MediaUrlNormalizer.NormalizeForStorage(raw);
            if (!string.IsNullOrWhiteSpace(normalized) && normalized.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
                paths.Add(normalized);
        }

        return paths.ToList();
    }

    private async Task<bool> IsReferencedAsync(string normalizedPath, CancellationToken ct)
    {
        if (await _context.ProductImages.AsNoTracking().AnyAsync(pi => pi.ImageUrl == normalizedPath, ct))
            return true;

        if (await _context.ProductColorImages.AsNoTracking().AnyAsync(pi => pi.ImageUrl == normalizedPath, ct))
            return true;

        if (await _context.ProductColorSizeImages.AsNoTracking().AnyAsync(pi => pi.ImageUrl == normalizedPath, ct))
            return true;

        if (await _context.Products.AsNoTracking().AnyAsync(p => p.ImageUrl == normalizedPath, ct))
            return true;

        if (await _context.OrderItems.AsNoTracking()
                .AnyAsync(oi => oi.ProductImageUrl != null && oi.ProductImageUrl.Contains(normalizedPath, StringComparison.OrdinalIgnoreCase), ct))
            return true;

        var settings = await _context.AppSettings.AsNoTracking()
            .Select(s => s.ValueJson)
            .ToListAsync(ct);

        foreach (var json in settings)
        {
            if (!string.IsNullOrWhiteSpace(json)
                && json.Contains(normalizedPath, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    [GeneratedRegex(@"/uploads/[A-Za-z0-9._-]+", RegexOptions.CultureInvariant)]
    private static partial Regex UploadPathPattern();
}
