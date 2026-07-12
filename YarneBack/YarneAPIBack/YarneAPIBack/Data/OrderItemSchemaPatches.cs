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
                DO $$
                DECLARE
                    fk_name text;
                BEGIN
                    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductName" character varying(200) NOT NULL DEFAULT '';
                    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductCode" character varying(50) NOT NULL DEFAULT '';
                    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductImageUrl" character varying(500) NULL;

                    UPDATE "OrderItem" oi
                    SET "ProductName" = p."Name",
                        "ProductCode" = p."ProductCode",
                        "ProductImageUrl" = NULLIF(p."ImageUrl", '')
                    FROM "Product" p
                    WHERE oi."ProductId" = p."Id"
                      AND (oi."ProductName" = '' OR oi."ProductCode" = '');

                    BEGIN
                        ALTER TABLE "OrderItem" ALTER COLUMN "ProductId" DROP NOT NULL;
                    EXCEPTION
                        WHEN others THEN NULL;
                    END;

                    SELECT tc.constraint_name
                    INTO fk_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = current_schema()
                      AND tc.table_name = 'OrderItem'
                      AND kcu.column_name = 'ProductId'
                    LIMIT 1;

                    IF fk_name IS NOT NULL THEN
                        EXECUTE format('ALTER TABLE "OrderItem" DROP CONSTRAINT %I', fk_name);
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE table_schema = current_schema()
                          AND table_name = 'OrderItem'
                          AND constraint_name = 'FK__OrderItem__Produ__6C190EBB'
                    ) THEN
                        ALTER TABLE "OrderItem"
                            ADD CONSTRAINT "FK__OrderItem__Produ__6C190EBB"
                            FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id") ON DELETE SET NULL;
                    END IF;
                END $$;
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
