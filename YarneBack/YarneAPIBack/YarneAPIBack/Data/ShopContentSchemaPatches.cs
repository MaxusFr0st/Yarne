using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

/// <summary>
/// English product texts, per-size measurements, the size-panel photo, and the retried-order id, as one
/// statement that is safe to run on every start. Same reason as <see cref="OrderFlowSchemaPatches"/>: a
/// failed EF migration is swallowed at bootstrap and the app would then serve with columns missing. The
/// migration for these runs the same IF NOT EXISTS statements, so either may run first. The one-time
/// English texts are NOT here (see <see cref="ProductEnglishSeed"/>), so a field the owner clears stays cleared.
/// </summary>
public static class ShopContentSchemaPatches
{
    public const string EnsureSql =
        """
        ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "NameEn" character varying(255) NULL;
        ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "DescriptionEn" text NULL;
        ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "MaterialEn" character varying(100) NULL;
        ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "SizePhotoUrl" character varying(500) NULL;
        ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "NameEn" character varying(100) NULL;
        ALTER TABLE "ProductSize" ADD COLUMN IF NOT EXISTS "WidthCm" numeric(5,1) NULL;
        ALTER TABLE "ProductSize" ADD COLUMN IF NOT EXISTS "HeightCm" numeric(5,1) NULL;
        ALTER TABLE "ProductSize" ADD COLUMN IF NOT EXISTS "DepthCm" numeric(5,1) NULL;
        ALTER TABLE "ProductSize" ADD COLUMN IF NOT EXISTS "HandleCm" numeric(5,1) NULL;
        ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "ClientRequestId" character varying(64) NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_Order_ClientRequestId" ON "Order" ("ClientRequestId") WHERE "ClientRequestId" IS NOT NULL;
        """;

    public static async Task ForceEnsureAsync(YarneDbContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        if (!db.Database.IsNpgsql())
            return;

        await db.Database.ExecuteSqlRawAsync(EnsureSql, cancellationToken);
        logger.LogInformation("Shop content schema ensured (English texts, size measurements, order request id).");
    }
}
