using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

public static class CustomerSchemaPatches
{
    private static int _oauthColumnsEnsured;

    public static async Task EnsureOAuthColumnsAsync(
        YarneDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (Interlocked.CompareExchange(ref _oauthColumnsEnsured, 1, 0) != 0)
            return;

        if (!db.Database.IsNpgsql())
            return;

        try
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "PhoneNumber" character varying(32) NULL;
                ALTER TABLE "Customer" ALTER COLUMN "PhoneNumber" TYPE character varying(32);
                ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "OAuthProvider" character varying(50) NULL;
                ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "OAuthProviderId" character varying(255) NULL;
                """,
                cancellationToken);
            logger.LogInformation("Verified Customer profile columns (PhoneNumber, OAuth).");
        }
        catch (Exception ex)
        {
            Interlocked.Exchange(ref _oauthColumnsEnsured, 0);
            logger.LogError(ex, "Failed to ensure Customer OAuth columns.");
            throw;
        }
    }
}
