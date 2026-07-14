using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class DatabaseStartup
{
    public static async Task ApplyMigrationsWithRetryAsync(
        YarneDbContext db,
        ILogger logger,
        int maxAttempts = 20,
        CancellationToken cancellationToken = default)
    {
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await db.Database.MigrateAsync(cancellationToken);
                logger.LogInformation("Database migrations applied successfully.");
                await CustomerSchemaPatches.EnsureOAuthColumnsAsync(db, logger, cancellationToken);
                await AccountingSchemaPatches.EnsureTablesAsync(db, logger, cancellationToken);
                await AccountingV2SchemaPatches.EnsureTablesAsync(db, logger, cancellationToken);
                await AccountingEnhancementsSchemaPatches.EnsureAsync(db, logger, cancellationToken);
                await AccountingUnlockImportLocksSchemaPatches.EnsureAsync(db, logger, cancellationToken);
                await OrderStatusSchemaPatches.EnsureOrderStatusesAsync(db, logger, cancellationToken);
                await OrderItemSchemaPatches.EnsureSnapshotColumnsAsync(db, logger, cancellationToken);
                await CatalogSchemaPatches.EnsureAsync(db, logger, cancellationToken);
                return;
            }
            catch (Exception ex) when (attempt < maxAttempts)
            {
                var delay = TimeSpan.FromSeconds(Math.Min(30, attempt * 3));
                logger.LogWarning(ex,
                    "Database not ready for migrations. Attempt {Attempt}/{MaxAttempts}. Retrying in {DelaySeconds}s.",
                    attempt, maxAttempts, delay.TotalSeconds);
                await Task.Delay(delay, cancellationToken);
            }
        }

        throw new InvalidOperationException("Database migrations could not be applied after retries.");
    }
}
