using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

/// <summary>Rules and clean-up for the "making of" photos the owner shows a customer while an order is being made.</summary>
public static class MakingPhotos
{
    public const int MaxPerOrder = 5;
    public const long MaxBytes = 8 * 1024 * 1024;

    /// <summary>Photos can be requested (and are shown) only while the order is being made.</summary>
    public static bool IsMakingStage(string status) => status is "Accepted" or "InProduction" or "Made";

    /// <summary>Deletes every photo of the order, files first. Returns how many.</summary>
    public static async Task<int> DeleteForOrderAsync(YarneDbContext db, IR2ImageStorageService storage, int orderId, CancellationToken ct)
    {
        var photos = await db.OrderMakingPhotos.Where(p => p.OrderId == orderId).ToListAsync(ct);
        return await DeleteAsync(db, storage, photos, ct);
    }

    /// <summary>Safety net: photos of orders that are Received, Canceled or voided but still have rows.</summary>
    public static async Task<int> DeleteForFinishedOrdersAsync(YarneDbContext db, IR2ImageStorageService storage, CancellationToken ct)
    {
        var photos = await db.OrderMakingPhotos
            .Where(p => p.Order.Status == "Received" || p.Order.Status == "Canceled" || p.Order.IsVoid)
            .ToListAsync(ct);
        return await DeleteAsync(db, storage, photos, ct);
    }

    private static async Task<int> DeleteAsync(YarneDbContext db, IR2ImageStorageService storage, List<OrderMakingPhoto> photos, CancellationToken ct)
    {
        foreach (var photo in photos)
            await storage.DeletePrivateAsync(photo.StorageKey, ct);
        if (photos.Count > 0)
        {
            db.OrderMakingPhotos.RemoveRange(photos);
            await db.SaveChangesAsync(ct);
        }

        return photos.Count;
    }
}
