using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class DatabaseBootstrap
{
    public static async Task RunAsync(WebApplication app, bool runStartupDbPatches, CancellationToken cancellationToken = default)
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var db = scope.ServiceProvider.GetRequiredService<YarneDbContext>();

        await DatabaseStartup.ApplyMigrationsWithRetryAsync(db, logger, cancellationToken: cancellationToken);

        if (runStartupDbPatches)
        {
            await ApplyStartupPatchesAsync(db, logger, app.Environment, cancellationToken);
        }

        await SeedData.EnsureSeedDataAsync(db, logger, app.Environment);
    }

    private static async Task ApplyStartupPatchesAsync(
        YarneDbContext db,
        ILogger logger,
        IHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 20;
        var startupPatchApplied = false;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                if (db.Database.IsNpgsql())
                {
                    await db.Database.ExecuteSqlRawAsync(
                        """
                        DO $$
                        BEGIN
                          IF NOT EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = current_schema()
                              AND table_name = 'Order'
                              AND column_name = 'EstimatedDelivery'
                          ) THEN
                            ALTER TABLE "Order" ADD COLUMN "EstimatedDelivery" timestamp without time zone NULL;
                          END IF;
                        END $$;
                        """,
                        cancellationToken);
                }
                else
                {
                    throw new NotSupportedException(
                        $"Startup DB patches not implemented for provider '{db.Database.ProviderName}'.");
                }

                startupPatchApplied = true;
                break;
            }
            catch (Exception ex) when (attempt < maxAttempts)
            {
                var delay = TimeSpan.FromSeconds(Math.Min(30, attempt * 3));
                logger.LogWarning(ex,
                    "Database is not ready yet during startup patch. Attempt {Attempt}/{MaxAttempts}. Retrying in {DelaySeconds}s.",
                    attempt, maxAttempts, delay.TotalSeconds);
                await Task.Delay(delay, cancellationToken);
            }
        }

        if (!startupPatchApplied)
        {
            const string message = "Startup database patch could not be applied after retries.";
            if (environment.IsDevelopment())
            {
                throw new InvalidOperationException(message);
            }

            logger.LogError(
                "{Message} Continuing startup; endpoints needing DB may fail until connectivity is fixed.",
                message);
        }
    }
}
