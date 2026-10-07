using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

/// <summary>Once a day, deletes the receipt files of orders that became Received or Canceled more than 30 days ago.</summary>
public sealed class ReceiptCleanupService : BackgroundService
{
    public static readonly TimeSpan Retention = TimeSpan.FromDays(30);

    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<ReceiptCleanupService> _logger;

    public ReceiptCleanupService(IServiceScopeFactory scopes, ILogger<ReceiptCleanupService> logger)
    {
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // First pass a minute after start (the database may still be migrating), then daily.
        try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (OperationCanceledException) { return; }
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopes.CreateScope();
                var removed = await DeleteExpiredAsync(
                    scope.ServiceProvider.GetRequiredService<YarneDbContext>(),
                    scope.ServiceProvider.GetRequiredService<IR2ImageStorageService>(),
                    DateTime.UtcNow,
                    stoppingToken);
                if (removed > 0)
                    _logger.LogInformation("Deleted {Count} expired payment receipts.", removed);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Receipt cleanup failed; it will try again tomorrow.");
            }

            try { await Task.Delay(TimeSpan.FromDays(1), stoppingToken); } catch (OperationCanceledException) { return; }
        }
    }

    /// <summary>Deletes the receipt of every order finished at least 30 days before <paramref name="now"/>. Returns how many.</summary>
    public static async Task<int> DeleteExpiredAsync(YarneDbContext db, IR2ImageStorageService storage, DateTime now, CancellationToken ct)
    {
        var cutoff = now - Retention;
        var orders = await db.Orders
            .Where(o => o.ReceiptKey != null && o.FinalizedAt != null && o.FinalizedAt <= cutoff)
            .ToListAsync(ct);
        foreach (var order in orders)
        {
            await storage.DeletePrivateAsync(order.ReceiptKey!, ct);
            order.ReceiptKey = null;
            order.ReceiptContentType = null;
            order.ReceiptUploadedAt = null;
        }

        if (orders.Count > 0)
            await db.SaveChangesAsync(ct);
        return orders.Count;
    }
}
