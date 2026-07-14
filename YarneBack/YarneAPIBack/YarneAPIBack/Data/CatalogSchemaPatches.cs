using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class CatalogSchemaPatches
{
    private static int _ensured;

    public const string EnsureSql = """
        ALTER TABLE "Color" ADD COLUMN IF NOT EXISTS "NameUk" character varying(100) NULL;

        CREATE TABLE IF NOT EXISTS "FurnitureColor" (
            "Id" serial PRIMARY KEY,
            "Name" character varying(100) NOT NULL,
            "NameUk" character varying(100) NULL,
            "HexCode" character varying(20) NOT NULL DEFAULT '#2D241E'
        );

        CREATE TABLE IF NOT EXISTS "ProductFurnitureColor" (
            "ProductId" integer NOT NULL,
            "FurnitureColorId" integer NOT NULL,
            "SortOrder" integer NOT NULL DEFAULT 0,
            PRIMARY KEY ("ProductId", "FurnitureColorId"),
            CONSTRAINT "FK_ProductFurnitureColor_Product"
                FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_ProductFurnitureColor_FurnitureColor"
                FOREIGN KEY ("FurnitureColorId") REFERENCES "FurnitureColor" ("Id") ON DELETE CASCADE
        );

        ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "DefaultFurnitureColorId" integer NULL;
        """;

    public static async Task EnsureAsync(
        YarneDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (Interlocked.CompareExchange(ref _ensured, 1, 0) != 0)
            return;

        if (!db.Database.IsNpgsql())
            return;

        try
        {
            await db.Database.ExecuteSqlRawAsync(EnsureSql, cancellationToken);
            logger.LogInformation("Verified catalog columns (Color.NameUk, FurnitureColor).");
        }
        catch (Exception ex)
        {
            Interlocked.Exchange(ref _ensured, 0);
            logger.LogError(ex, "Failed to ensure catalog schema patches.");
            throw;
        }
    }
}
