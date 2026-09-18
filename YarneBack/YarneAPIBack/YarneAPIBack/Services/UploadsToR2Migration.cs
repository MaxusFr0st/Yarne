using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

/// <summary>
/// One-off migration: copies every /uploads/... file still living on the API container's disk
/// into R2 and repoints the database at the new public URLs.
///
/// Runs inside the deployed API because that is the only process with the Railway volume
/// mounted - an external CLI run gets a fresh container with no photos in it.
///
/// Safe to re-run. Each file keeps its existing GUID filename as its R2 key, so a second pass
/// finds the object already present and skips the upload. Uploads deliberately happen outside
/// the DB transaction: if the rewrite fails, the re-run reuses the objects already in R2 and
/// only retries the database work.
///
/// OrderItem.ProductImageUrl is left untouched on purpose - those rows are a snapshot of what
/// was actually sold, and the /uploads route stays mounted so they keep rendering.
/// </summary>
public static partial class UploadsToR2Migration
{
    public sealed class Report
    {
        public bool DryRun { get; init; }
        public int FilesFound { get; set; }
        public int Uploaded { get; set; }
        public int AlreadyInR2 { get; set; }
        public int MissingOnDisk { get; set; }
        public int FailedUploads { get; set; }
        public int ProductRowsUpdated { get; set; }
        public int ProductImageRowsUpdated { get; set; }
        public int ColorImageRowsUpdated { get; set; }
        public int ColorSizeImageRowsUpdated { get; set; }
        public int AppSettingRowsUpdated { get; set; }
        public List<string> Missing { get; } = [];
        public List<string> Failures { get; } = [];
    }

    public static async Task<Report> RunAsync(
        YarneDbContext db,
        IR2ImageStorageService r2Storage,
        IUploadFileStorageService uploadStorage,
        IWebHostEnvironment env,
        ILogger logger,
        bool dryRun,
        CancellationToken ct = default)
    {
        if (!r2Storage.IsConfigured)
            throw new InvalidOperationException("R2 storage is not configured - set R2_* environment variables first.");

        var report = new Report { DryRun = dryRun };

        // 1. Gather every distinct /uploads/... path the database still points at.
        var paths = await CollectReferencedPathsAsync(db, uploadStorage, ct);
        report.FilesFound = paths.Count;

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var uploadsDir = Path.Combine(webRoot, "uploads");

        // 2. Copy each one into R2, keyed by its existing filename.
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var path in paths)
        {
            ct.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(path);
            if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..", StringComparison.Ordinal))
            {
                report.Failures.Add($"{path} (unsafe filename)");
                report.FailedUploads++;
                continue;
            }

            var filePath = Path.Combine(uploadsDir, fileName);
            if (!File.Exists(filePath))
            {
                // Referenced in the DB but gone from disk. Leave the row alone rather than
                // pointing it at an object that was never uploaded.
                report.Missing.Add(path);
                report.MissingOnDisk++;
                continue;
            }

            try
            {
                if (await r2Storage.ExistsAsync(fileName, ct))
                {
                    map[path] = r2Storage.BuildPublicUrl(fileName);
                    report.AlreadyInR2++;
                    continue;
                }

                if (dryRun)
                {
                    map[path] = r2Storage.BuildPublicUrl(fileName);
                    report.Uploaded++;
                    continue;
                }

                await using var stream = File.OpenRead(filePath);
                map[path] = await r2Storage.UploadWithKeyAsync(stream, ContentTypeFor(fileName), fileName, ct);
                report.Uploaded++;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to migrate upload {UploadPath} to R2", path);
                report.Failures.Add($"{path} ({ex.Message})");
                report.FailedUploads++;
            }
        }

        if (map.Count == 0)
        {
            logger.LogInformation("Uploads to R2 migration: nothing to rewrite");
            return report;
        }

        if (dryRun)
        {
            await CountRewritesAsync(db, map, report, ct);
            return report;
        }

        // 3. Repoint the database, atomically, so a failure mid-way cannot leave half the
        //    gallery on one host and half on the other.
        //
        //    The context uses Npgsql's retrying execution strategy, which refuses a hand-rolled
        //    BeginTransaction: a retry has to replay the whole unit, so the transaction has to
        //    live inside the strategy rather than wrap it.
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(() => RewriteDatabaseAsync(db, map, report, ct));

        logger.LogInformation(
            "Uploads to R2 migration complete: {Uploaded} uploaded, {Existing} already present, {Missing} missing on disk, {Failed} failed",
            report.Uploaded, report.AlreadyInR2, report.MissingOnDisk, report.FailedUploads);

        return report;
    }

    /// <summary>
    /// Swaps every migrated URL into the tables that reference it, inside one transaction.
    /// Re-entrant: the retrying execution strategy may replay this whole method, so the row
    /// counters reset on entry rather than accumulating across attempts.
    /// </summary>
    private static async Task RewriteDatabaseAsync(
        YarneDbContext db,
        Dictionary<string, string> map,
        Report report,
        CancellationToken ct)
    {
        report.ProductRowsUpdated = 0;
        report.ProductImageRowsUpdated = 0;
        report.ColorImageRowsUpdated = 0;
        report.ColorSizeImageRowsUpdated = 0;
        report.AppSettingRowsUpdated = 0;

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var products = await db.Products.Where(p => p.ImageUrl != null).ToListAsync(ct);
        foreach (var row in products)
        {
            if (TryMap(map, row.ImageUrl, out var url))
            {
                row.ImageUrl = url;
                report.ProductRowsUpdated++;
            }
        }

        var productImages = await db.ProductImages.ToListAsync(ct);
        foreach (var row in productImages)
        {
            if (TryMap(map, row.ImageUrl, out var url))
            {
                row.ImageUrl = url;
                report.ProductImageRowsUpdated++;
            }
        }

        var colorImages = await db.ProductColorImages.ToListAsync(ct);
        foreach (var row in colorImages)
        {
            if (TryMap(map, row.ImageUrl, out var url))
            {
                row.ImageUrl = url;
                report.ColorImageRowsUpdated++;
            }
        }

        var colorSizeImages = await db.ProductColorSizeImages.ToListAsync(ct);
        foreach (var row in colorSizeImages)
        {
            if (TryMap(map, row.ImageUrl, out var url))
            {
                row.ImageUrl = url;
                report.ColorSizeImageRowsUpdated++;
            }
        }

        var settings = await db.AppSettings.ToListAsync(ct);
        foreach (var row in settings)
        {
            var rewritten = RewriteJson(row.ValueJson, map);
            if (rewritten != row.ValueJson)
            {
                row.ValueJson = rewritten;
                row.UpdatedAt = DateTime.UtcNow;
                report.AppSettingRowsUpdated++;
            }
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    private static async Task<List<string>> CollectReferencedPathsAsync(
        YarneDbContext db,
        IUploadFileStorageService uploadStorage,
        CancellationToken ct)
    {
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void Add(string? raw)
        {
            var normalized = MediaUrlNormalizer.NormalizeForStorage(raw);
            if (!string.IsNullOrWhiteSpace(normalized)
                && normalized.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            {
                paths.Add(normalized);
            }
        }

        foreach (var url in await db.Products.AsNoTracking().Select(p => p.ImageUrl).ToListAsync(ct))
            Add(url);
        foreach (var url in await db.ProductImages.AsNoTracking().Select(p => p.ImageUrl).ToListAsync(ct))
            Add(url);
        foreach (var url in await db.ProductColorImages.AsNoTracking().Select(p => p.ImageUrl).ToListAsync(ct))
            Add(url);
        foreach (var url in await db.ProductColorSizeImages.AsNoTracking().Select(p => p.ImageUrl).ToListAsync(ct))
            Add(url);

        foreach (var json in await db.AppSettings.AsNoTracking().Select(s => s.ValueJson).ToListAsync(ct))
        {
            foreach (var path in uploadStorage.ExtractUploadPathsFromJson(json))
                Add(path);
        }

        return paths.ToList();
    }

    private static async Task CountRewritesAsync(
        YarneDbContext db,
        Dictionary<string, string> map,
        Report report,
        CancellationToken ct)
    {
        // Counted in memory rather than as a SQL IN(...): rows may hold either the bare
        // /uploads/x path or a stale absolute form, and only NormalizeForStorage collapses the
        // two. A database-side comparison would silently miss the absolute ones.
        report.ProductRowsUpdated = (await db.Products.AsNoTracking().Select(p => p.ImageUrl).ToListAsync(ct))
            .Count(url => TryMap(map, url, out _));
        report.ProductImageRowsUpdated = (await db.ProductImages.AsNoTracking().Select(p => p.ImageUrl).ToListAsync(ct))
            .Count(url => TryMap(map, url, out _));
        report.ColorImageRowsUpdated = (await db.ProductColorImages.AsNoTracking().Select(p => p.ImageUrl).ToListAsync(ct))
            .Count(url => TryMap(map, url, out _));
        report.ColorSizeImageRowsUpdated = (await db.ProductColorSizeImages.AsNoTracking().Select(p => p.ImageUrl).ToListAsync(ct))
            .Count(url => TryMap(map, url, out _));

        foreach (var json in await db.AppSettings.AsNoTracking().Select(s => s.ValueJson).ToListAsync(ct))
        {
            if (RewriteJson(json, map) != json)
                report.AppSettingRowsUpdated++;
        }
    }

    /// <summary>
    /// Looks up a stored URL in the migration map. Normalizes first, because a row may hold
    /// either "/uploads/x.webp" or "https://api.example.com/uploads/x.webp" and both refer to
    /// the same file - a raw dictionary hit would only ever match the first form.
    /// </summary>
    private static bool TryMap(Dictionary<string, string> map, string? raw, out string url)
    {
        var normalized = MediaUrlNormalizer.NormalizeForStorage(raw);
        if (!string.IsNullOrWhiteSpace(normalized) && map.TryGetValue(normalized, out var found))
        {
            url = found;
            return true;
        }

        url = string.Empty;
        return false;
    }

    /// <summary>
    /// Swaps every /uploads/... reference inside a settings JSON blob for its R2 URL.
    ///
    /// Matches an optional scheme+host in front of the path and replaces the whole reference, so
    /// a stored absolute URL becomes the R2 URL outright. Replacing just the path portion would
    /// splice one URL into the middle of another and corrupt the setting.
    /// </summary>
    public static string RewriteJson(string? json, Dictionary<string, string> map)
    {
        if (string.IsNullOrWhiteSpace(json)) return json ?? string.Empty;

        return UploadReferencePattern().Replace(json, match =>
        {
            var path = $"/uploads/{match.Groups["file"].Value}";
            return map.TryGetValue(path, out var url) ? url : match.Value;
        });
    }

    [GeneratedRegex(@"(?:https?://[^""'\s\\]*?)?/uploads/(?<file>[A-Za-z0-9._-]+)", RegexOptions.CultureInvariant)]
    private static partial Regex UploadReferencePattern();

    private static string ContentTypeFor(string fileName) =>
        Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".webp" => "image/webp",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream",
        };
}
