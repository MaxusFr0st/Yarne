using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class OrderItemSchemaPatches
{
    private static int _snapshotColumnsEnsured;

    public static async Task EnsureSnapshotColumnsAsync(
        YarneDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (Interlocked.CompareExchange(ref _snapshotColumnsEnsured, 1, 0) != 0)
            return;

        if (!db.Database.IsNpgsql())
            return;

        try
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductName" character varying(200) NOT NULL DEFAULT '';
                ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductCode" character varying(50) NOT NULL DEFAULT '';
                ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductImageUrl" character varying(500) NULL;
                ALTER TABLE "OrderItem" ALTER COLUMN "ProductId" DROP NOT NULL;
                UPDATE "OrderItem" oi
                SET "ProductName" = p."Name",
                    "ProductCode" = p."ProductCode",
                    "ProductImageUrl" = NULLIF(p."ImageUrl", '')
                FROM "Product" p
                WHERE oi."ProductId" = p."Id"
                  AND (oi."ProductName" = '' OR oi."ProductCode" = '');
                """,
                cancellationToken);
            logger.LogInformation("Verified OrderItem product snapshot columns.");
        }
        catch (Exception ex)
        {
            Interlocked.Exchange(ref _snapshotColumnsEnsured, 0);
            logger.LogError(ex, "Failed to ensure OrderItem snapshot columns.");
            throw;
        }
    }
}
