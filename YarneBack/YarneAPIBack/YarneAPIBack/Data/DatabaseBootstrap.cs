using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using YarneAPIBack.Configuration;

namespace YarneAPIBack.Data;

public static class DatabaseBootstrap
{
    public static async Task RunAsync(WebApplication app, bool runStartupDbPatches, CancellationToken cancellationToken = default)
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        if (!RailwayDatabaseConfiguration.TryResolve(configuration, logger, out _))
        {
            const string message = "PostgreSQL is not configured.";
            logger.LogError("Skipping database bootstrap because {Message}", message);
            DatabaseReadiness.MarkFailed(message);
            return;
        }

        var db = scope.ServiceProvider.GetRequiredService<YarneDbContext>();

        await OrderItemSchemaPatches.ForceEnsureSnapshotColumnsAsync(db, logger, cancellationToken);

        // RefreshToken is required by cookie auth login/refresh — ensure before other work.
        try
        {
            await RefreshTokenSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "RefreshToken schema not ready at bootstrap start; will retry after migrations.");
        }

        try
        {
            await FocalPointSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "FocalPoint schema not ready at bootstrap start; will retry after migrations.");
        }

        // Catalog columns/tables are required by Product EF queries (NameUk, furniture).
        const int catalogAttempts = 8;
        for (var attempt = 1; attempt <= catalogAttempts; attempt++)
        {
            try
            {
                await CatalogSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
                break;
            }
            catch (Exception ex) when (attempt < catalogAttempts)
            {
                var delay = TimeSpan.FromSeconds(Math.Min(15, attempt * 2));
                logger.LogWarning(ex,
                    "Catalog schema not ready. Attempt {Attempt}/{Max}. Retrying in {Delay}s.",
                    attempt, catalogAttempts, delay.TotalSeconds);
                await Task.Delay(delay, cancellationToken);
            }
        }

        try
        {
            await DatabaseStartup.ApplyMigrationsWithRetryAsync(db, logger, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "EF migrations failed. Re-applying critical schema patches before continuing.");
            await OrderItemSchemaPatches.ForceEnsureSnapshotColumnsAsync(db, logger, cancellationToken);
            try
            {
                await CatalogSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
            }
            catch (Exception catalogEx)
            {
                logger.LogError(catalogEx, "Catalog schema re-apply failed after migration failure.");
            }
            try
            {
                await RefreshTokenSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
            }
            catch (Exception refreshEx)
            {
                logger.LogError(refreshEx, "RefreshToken schema re-apply failed after migration failure.");
            }
            try
            {
                await FocalPointSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
            }
            catch (Exception focalEx)
            {
                logger.LogError(focalEx, "FocalPoint schema re-apply failed after migration failure.");
            }
        }

        // Final guarantee before marking bootstrap ready — products crash without this.
        try
        {
            await CatalogSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception catalogEx)
        {
            logger.LogError(catalogEx, "Catalog schema still missing after bootstrap; /api/products will 500 until fixed.");
        }

        try
        {
            await RefreshTokenSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception refreshEx)
        {
            logger.LogError(refreshEx, "RefreshToken schema still missing after bootstrap; /api/auth/login will 500 until fixed.");
        }

        try
        {
            await FocalPointSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception focalEx)
        {
            logger.LogError(focalEx, "FocalPoint columns still missing after bootstrap; /api/products will 500 until fixed.");
        }

        try
        {
            await SaleComponentSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception saleComponentEx)
        {
            logger.LogError(
                saleComponentEx,
                "SaleComponent schema still missing after bootstrap; lace composition endpoints may 500 until fixed.");
        }

        try
        {
            await ColorLaceMappingSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception colorLaceMappingEx)
        {
            logger.LogError(
                colorLaceMappingEx,
                "ColorLaceMapping schema still missing after bootstrap; global lace mapping endpoints may 500 until fixed.");
        }

        try
        {
            await MaterialRollTrackingSchemaPatches.ForceEnsureAsync(db, logger, cancellationToken);
        }
        catch (Exception rollTrackingEx)
        {
            logger.LogError(
                rollTrackingEx,
                "Material roll-tracking schema still missing after bootstrap; purchase-order roll fields may 500 until fixed.");
        }

        if (runStartupDbPatches)
        {
            await ApplyStartupPatchesAsync(db, logger, app.Environment, cancellationToken);
        }

        await SeedData.EnsureSeedDataAsync(db, configuration, logger, app.Environment.IsProduction(), cancellationToken);

        if (await OrderItemSchemaPatches.HasSnapshotColumnsAsync(db, cancellationToken))
        {
            DatabaseReadiness.MarkReady();
            logger.LogInformation("Database bootstrap completed; orders schema is ready.");
        }
        else
        {
            const string message = "OrderItem snapshot columns are still missing after bootstrap.";
            logger.LogError("{Message}", message);
            DatabaseReadiness.MarkFailed(message);
        }
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
                            WHERE table_schema = 'public'
                              AND table_name = 'Order'
                              AND column_name = 'EstimatedDelivery'
                          ) THEN
                            ALTER TABLE "Order" ADD COLUMN "EstimatedDelivery" timestamp without time zone NULL;
                          END IF;

                          IF NOT EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'Customer'
                              AND column_name = 'OAuthProvider'
                          ) THEN
                            ALTER TABLE "Customer" ADD COLUMN "OAuthProvider" character varying(50) NULL;
                          END IF;

                          IF NOT EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'Customer'
                              AND column_name = 'OAuthProviderId'
                          ) THEN
                            ALTER TABLE "Customer" ADD COLUMN "OAuthProviderId" character varying(255) NULL;
                          END IF;
                        END $$;
                        """,
                        cancellationToken);

                    await OrderItemSchemaPatches.ForceEnsureSnapshotColumnsAsync(db, logger, cancellationToken);
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
