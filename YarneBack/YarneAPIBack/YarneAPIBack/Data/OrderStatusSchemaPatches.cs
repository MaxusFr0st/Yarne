using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class OrderStatusSchemaPatches
{
    private static int _ensured;

    public static async Task EnsureOrderStatusesAsync(
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
                UPDATE "Order" SET "Status" = 'Accepted' WHERE "Status" IN ('Processing', 'Confirmed');
                UPDATE "Order" SET "Status" = 'Received' WHERE "Status" = 'Delivered';
                UPDATE "Order" SET "Status" = 'Canceled' WHERE "Status" = 'Cancelled';

                ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "CHK_Order_Status";

                ALTER TABLE "Order" ADD CONSTRAINT "CHK_Order_Status"
                    CHECK ("Status" IN (
                        'Pending',
                        'Accepted',
                        'InProduction',
                        'Made',
                        'Shipped',
                        'Received',
                        'Canceled'
                    ));
                """,
                cancellationToken);
            logger.LogInformation("Verified Order status constraint and migrated legacy values.");
        }
        catch (Exception ex)
        {
            Interlocked.Exchange(ref _ensured, 0);
            logger.LogError(ex, "Failed to ensure Order status schema.");
            throw;
        }
    }
}
