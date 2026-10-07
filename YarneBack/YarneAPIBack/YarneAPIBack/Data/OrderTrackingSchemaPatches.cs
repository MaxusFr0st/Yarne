using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YarneAPIBack.Services;

namespace YarneAPIBack.Data;

/// <summary>
/// Gives every order placed before the public order number and status token existed one of each.
/// Runs after migrations (which add the columns empty, so a live database with rows migrates safely)
/// and does nothing once every order has them, so it is cheap to run on every start.
/// </summary>
public static class OrderTrackingSchemaPatches
{
    private const int BatchSize = 200;

    public static async Task EnsureAsync(YarneDbContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        var filled = 0;
        while (true)
        {
            var batch = await db.Orders
                .Where(o => o.OrderNumber == null || o.StatusToken == null)
                .OrderBy(o => o.Id)
                .Take(BatchSize)
                .ToListAsync(cancellationToken);
            if (batch.Count == 0)
                break;

            // Numbers go by the day the order was placed, in the order the orders were made (by Id), after any already given that day.
            var next = new Dictionary<string, int>();
            foreach (var order in batch.Where(o => o.OrderNumber == null))
            {
                var prefix = OrderPublicIdentifiers.DayPrefix(order.OrderDate);
                if (!next.TryGetValue(prefix, out var count))
                {
                    var taken = await db.Orders
                        .Where(o => o.OrderNumber != null && o.OrderNumber.StartsWith(prefix + "-"))
                        .Select(o => o.OrderNumber)
                        .ToListAsync(cancellationToken);
                    count = taken.Select(n => OrderPublicIdentifiers.CountOf(n, prefix)).DefaultIfEmpty(0).Max();
                }

                next[prefix] = ++count;
                order.OrderNumber = $"{prefix}-{count}";
            }

            foreach (var order in batch)
            {
                order.StatusToken ??= OrderPublicIdentifiers.NewStatusToken();
            }

            await db.SaveChangesAsync(cancellationToken);
            filled += batch.Count;
        }

        if (filled > 0)
            logger.LogInformation("Gave {Count} existing orders a public order number and status token.", filled);
    }
}
