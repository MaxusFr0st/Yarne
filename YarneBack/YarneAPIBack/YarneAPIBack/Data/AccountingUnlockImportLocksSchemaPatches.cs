using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class AccountingUnlockImportLocksSchemaPatches
{
    private static int _ensured;

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
            await db.Database.ExecuteSqlRawAsync(
                """
                UPDATE "ImportTransaction" SET "IsLocked" = false WHERE "IsLocked" = true;
                """,
                cancellationToken);

            logger.LogInformation("Unlocked all import transactions.");
        }
        catch (Exception ex)
        {
            Interlocked.Exchange(ref _ensured, 0);
            logger.LogError(ex, "Failed to unlock import transactions.");
            throw;
        }
    }
}
