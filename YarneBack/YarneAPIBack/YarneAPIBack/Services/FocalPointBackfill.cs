using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using YarneAPIBack.Data;

namespace YarneAPIBack.Services;

/// <summary>
/// One-off backfill: iterates existing uploaded images and computes focal points
/// for any row that still has defaults (0.5, 0.35). Safe to re-run.
/// </summary>
public static class FocalPointBackfill
{
    private const float DefaultX = 0.5f;
    private const float DefaultY = 0.35f;
    private const float Epsilon = 0.001f;

    public static async Task RunAsync(
        YarneDbContext db,
        IWebHostEnvironment env,
        ILogger logger,
        bool force = false,
        CancellationToken ct = default)
    {
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var uploadsDir = Path.Combine(webRoot, "uploads");

        var processed = 0;
        var skipped = 0;
        var failed = 0;

        // ProductImage
        var productImages = await db.Set<Models.ProductImage>().ToListAsync(ct);
        foreach (var row in productImages)
        {
            if (!force && !IsDefault(row.FocalX, row.FocalY)) { skipped++; continue; }
            var (ok, fx, fy) = await DetectForPath(row.ImageUrl, uploadsDir, logger, ct);
            if (ok) { row.FocalX = fx; row.FocalY = fy; processed++; }
            else { failed++; }
        }

        // ProductColorImage
        var colorImages = await db.Set<Models.ProductColorImage>().ToListAsync(ct);
        foreach (var row in colorImages)
        {
            if (!force && !IsDefault(row.FocalX, row.FocalY)) { skipped++; continue; }
            var (ok, fx, fy) = await DetectForPath(row.ImageUrl, uploadsDir, logger, ct);
            if (ok) { row.FocalX = fx; row.FocalY = fy; processed++; }
            else { failed++; }
        }

        // ProductColorSizeImage
        var sizeImages = await db.Set<Models.ProductColorSizeImage>().ToListAsync(ct);
        foreach (var row in sizeImages)
        {
            if (!force && !IsDefault(row.FocalX, row.FocalY)) { skipped++; continue; }
            var (ok, fx, fy) = await DetectForPath(row.ImageUrl, uploadsDir, logger, ct);
            if (ok) { row.FocalX = fx; row.FocalY = fy; processed++; }
            else { failed++; }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "FocalPoint backfill complete: processed={Processed}, skipped={Skipped}, failed={Failed}",
            processed, skipped, failed);
    }

    private static bool IsDefault(float x, float y) =>
        MathF.Abs(x - DefaultX) < Epsilon && MathF.Abs(y - DefaultY) < Epsilon;

    private static async Task<(bool Success, float FocalX, float FocalY)> DetectForPath(
        string imageUrl, string uploadsDir, ILogger logger, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return (false, DefaultX, DefaultY);

        var relativePath = imageUrl.TrimStart('/');
        if (!relativePath.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
            return (false, DefaultX, DefaultY);

        var fileName = Path.GetFileName(relativePath);
        var filePath = Path.Combine(uploadsDir, fileName);

        if (!File.Exists(filePath))
        {
            logger.LogWarning("Backfill: file missing — {Path}", filePath);
            return (false, DefaultX, DefaultY);
        }

        try
        {
            await using var stream = File.OpenRead(filePath);
            using var image = await Image.LoadAsync<Rgba32>(stream, ct);
            var (fx, fy) = FocalPointDetector.Detect(image);
            return (true, fx, fy);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Backfill: failed to process {Path}", filePath);
            return (false, DefaultX, DefaultY);
        }
    }
}
