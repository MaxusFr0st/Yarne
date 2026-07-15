using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class FocalPointSchemaPatches
{
    private static int _ensured;

    private static readonly string[] EnsureStatements =
    [
        """ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "FocalX" real NOT NULL DEFAULT 0.5;""",
        """ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "FocalY" real NOT NULL DEFAULT 0.35;""",
        """ALTER TABLE "ProductColorImage" ADD COLUMN IF NOT EXISTS "FocalX" real NOT NULL DEFAULT 0.5;""",
        """ALTER TABLE "ProductColorImage" ADD COLUMN IF NOT EXISTS "FocalY" real NOT NULL DEFAULT 0.35;""",
        """ALTER TABLE "ProductColorSizeImage" ADD COLUMN IF NOT EXISTS "FocalX" real NOT NULL DEFAULT 0.5;""",
        """ALTER TABLE "ProductColorSizeImage" ADD COLUMN IF NOT EXISTS "FocalY" real NOT NULL DEFAULT 0.35;""",
    ];

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
            logger.LogError(ex, "FocalPoint schema ensure failed; will retry via bootstrap.");
        }
    }

    public static async Task ForceEnsureAsync(
        YarneDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!db.Database.IsNpgsql())
            return;

        foreach (var sql in EnsureStatements)
        {
            await db.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }

        Interlocked.Exchange(ref _ensured, 1);
        logger.LogInformation("Verified FocalPoint columns on ProductImage, ProductColorImage, ProductColorSizeImage.");
    }
}
