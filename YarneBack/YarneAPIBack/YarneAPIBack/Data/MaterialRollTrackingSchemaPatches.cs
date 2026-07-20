using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

/// <summary>
/// Idempotent self-heal for the roll/discrete-item tracking schema: Material.TrackByItem,
/// Material.DefaultLengthPerItem, PurchaseOrderItem.ItemCount, PurchaseOrderItem.LengthPerItem,
/// and the CK_PurchaseOrderItem_ItemShape check constraint. Mirrors the ADD COLUMN IF NOT
/// EXISTS pattern used elsewhere (e.g. FocalPointSchemaPatches, SaleComponentSchemaPatches)
/// so a partially-migrated production DB self-heals on boot.
/// </summary>
public static class MaterialRollTrackingSchemaPatches
{
    private static int _ensured;

    private const string EnsureSql =
        """
        DO $$
        BEGIN
            ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "TrackByItem" boolean NOT NULL DEFAULT false;
            ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "DefaultLengthPerItem" numeric(18,4) NULL;

            ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "ItemCount" integer NULL;
            ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "LengthPerItem" numeric(18,4) NULL;
            ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "RollPriceCents" bigint NULL;

            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'CK_PurchaseOrderItem_ItemShape'
                  AND conrelid = '"PurchaseOrderItem"'::regclass
            ) THEN
                ALTER TABLE "PurchaseOrderItem"
                    ADD CONSTRAINT "CK_PurchaseOrderItem_ItemShape"
                    CHECK (("ItemCount" IS NULL AND "LengthPerItem" IS NULL) OR ("ItemCount" > 0 AND "LengthPerItem" > 0));
            END IF;
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
        logger.LogInformation(
            "Verified material roll-tracking schema (Material.TrackByItem/DefaultLengthPerItem, PurchaseOrderItem.ItemCount/LengthPerItem).");
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
            logger.LogError(ex, "Material roll-tracking schema ensure failed; will retry via bootstrap.");
        }
    }
}
