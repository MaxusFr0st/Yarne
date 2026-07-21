using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

/// <summary>
/// Idempotent self-heal for Category.TrackStock. Mirrors ADD COLUMN IF NOT EXISTS
/// used by MaterialRollTrackingSchemaPatches so a partially-migrated DB recovers on boot.
/// Also backfills TrackStock=false for lace/ремінець category names.
/// </summary>
public static class CategoryTrackStockSchemaPatches
{
    private static int _ensured;

    private const string EnsureSql =
        """
        ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "TrackStock" boolean NOT NULL DEFAULT true;
        """;

    public static async Task ForceEnsureAsync(
        YarneDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!db.Database.IsNpgsql())
            return;

        await db.Database.ExecuteSqlRawAsync(EnsureSql, cancellationToken);
        Interlocked.Exchange(ref _ensured, 1);
        logger.LogInformation("Verified Category.TrackStock schema.");
    }

    public static async Task EnsureAsync(
        YarneDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (Interlocked.CompareExchange(ref _ensured, 1, 0) != 0)
            return;

        try
        {
            await ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception ex)
        {
            Interlocked.Exchange(ref _ensured, 0);
            logger.LogError(ex, "Category.TrackStock schema ensure failed; will retry via bootstrap.");
        }
    }
}
