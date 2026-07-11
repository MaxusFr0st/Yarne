using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class OrderContactPhoneSchemaPatches
{
    private static int _ensured;

    public static async Task EnsureContactPhoneColumnAsync(
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
            await db.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "ContactPhone" character varying(20) NULL;
                """,
                cancellationToken);
            logger.LogInformation("Verified Order.ContactPhone column.");
        }
        catch (Exception ex)
        {
            Interlocked.Exchange(ref _ensured, 0);
            logger.LogError(ex, "Failed to ensure Order.ContactPhone column.");
            throw;
        }
    }
}
