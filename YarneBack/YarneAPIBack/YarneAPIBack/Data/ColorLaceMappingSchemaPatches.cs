using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

/// <summary>
/// Idempotent self-heal for the global color-to-lace-product mapping: Color.LaceProductId
/// (+ FK + index). Mirrors the ADD COLUMN IF NOT EXISTS pattern used elsewhere so a
/// partially-migrated production DB recovers on boot.
/// </summary>
public static class ColorLaceMappingSchemaPatches
{
    private static int _ensured;

    private const string EnsureSql =
        """
        DO $$
        BEGIN
            ALTER TABLE "Color" ADD COLUMN IF NOT EXISTS "LaceProductId" integer NULL;

            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public'
                  AND tc.table_name = 'Color'
                  AND kcu.column_name = 'LaceProductId'
            ) THEN
                ALTER TABLE "Color"
                    ADD CONSTRAINT "FK_Color_Product_LaceProductId"
                    FOREIGN KEY ("LaceProductId") REFERENCES "Product" ("Id") ON DELETE NO ACTION;
            END IF;

            CREATE INDEX IF NOT EXISTS "IX_Color_LaceProductId" ON "Color" ("LaceProductId");
        END $$;
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
        logger.LogInformation("Verified color-lace-mapping schema (Color.LaceProductId).");
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
            logger.LogError(ex, "ColorLaceMapping schema ensure failed; will retry via bootstrap.");
        }
    }
}
