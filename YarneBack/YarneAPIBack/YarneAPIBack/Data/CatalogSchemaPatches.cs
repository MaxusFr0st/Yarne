using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class CatalogSchemaPatches
{
    private static int _ensured;

    private static readonly string[] EnsureStatements =
    [
        """ALTER TABLE "Color" ADD COLUMN IF NOT EXISTS "NameUk" character varying(100) NULL;""",
        """
        CREATE TABLE IF NOT EXISTS "FurnitureColor" (
            "Id" serial PRIMARY KEY,
            "Name" character varying(100) NOT NULL,
            "NameUk" character varying(100) NULL,
            "HexCode" character varying(20) NOT NULL DEFAULT '#2D241E'
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "ProductFurnitureColor" (
            "ProductId" integer NOT NULL,
            "FurnitureColorId" integer NOT NULL,
            "SortOrder" integer NOT NULL DEFAULT 0,
            PRIMARY KEY ("ProductId", "FurnitureColorId")
        );
        """,
        // FKs added separately so CREATE TABLE still succeeds if they already exist.
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'FK_ProductFurnitureColor_Product'
            ) THEN
                ALTER TABLE "ProductFurnitureColor"
                    ADD CONSTRAINT "FK_ProductFurnitureColor_Product"
                    FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id") ON DELETE CASCADE;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'FK_ProductFurnitureColor_FurnitureColor'
            ) THEN
                ALTER TABLE "ProductFurnitureColor"
                    ADD CONSTRAINT "FK_ProductFurnitureColor_FurnitureColor"
                    FOREIGN KEY ("FurnitureColorId") REFERENCES "FurnitureColor" ("Id") ON DELETE CASCADE;
            END IF;
        END $$;
        """,
        """ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "DefaultFurnitureColorId" integer NULL;""",
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
            logger.LogError(ex, "Catalog schema ensure failed during migrations path; will retry via bootstrap ForceEnsure.");
        }
    }

    /// <summary>
    /// Always attempt catalog DDL. Safe to call repeatedly.
    /// Throws on failure so callers can retry — products require these columns.
    /// </summary>
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
        logger.LogInformation("Verified catalog columns (Color.NameUk, FurnitureColor).");
    }
}
