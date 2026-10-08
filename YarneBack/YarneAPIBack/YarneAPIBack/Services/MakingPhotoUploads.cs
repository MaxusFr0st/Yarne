using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

/// <summary>Validates and stores the owner's making-of photos: images only (sniffed from the bytes), 8 MB each, 5 per order.</summary>
public sealed class MakingPhotoUploads
{
    private readonly YarneDbContext _db;
    private readonly IR2ImageStorageService _storage;
    private readonly IImageUploadNormalizer _normalizer;

    public MakingPhotoUploads(YarneDbContext db, IR2ImageStorageService storage, IImageUploadNormalizer normalizer)
    {
        _db = db;
        _storage = storage;
        _normalizer = normalizer;
    }

    public sealed record Result(string? Error, int Added, bool NotifyCustomer);

    /// <summary>
    /// Adds the files to the (tracked) order. Nothing is stored unless every file is acceptable. When the customer had asked and was not told
    /// yet, the order is marked as notified and the result says the one email should go out.
    /// </summary>
    public async Task<Result> AddAsync(Order order, IReadOnlyList<IFormFile> files, CancellationToken ct)
    {
        if (order.Status is "Received" or "Canceled" || order.IsVoid)
            return new Result("Photos can't be added to a finished order.", 0, false);
        if (files.Count == 0)
            return new Result("Please choose at least one photo.", 0, false);
        if (!_storage.IsConfigured)
            return new Result("Photo storage is not configured.", 0, false);

        var existing = await _db.OrderMakingPhotos.CountAsync(p => p.OrderId == order.Id, ct);
        if (existing + files.Count > MakingPhotos.MaxPerOrder)
            return new Result($"At most {MakingPhotos.MaxPerOrder} photos per order.", 0, false);

        var checkedFiles = new List<(IFormFile File, string ContentType, string Extension)>();
        foreach (var file in files)
        {
            if (file.Length == 0 || file.Length > MakingPhotos.MaxBytes)
                return new Result("Each photo must be at most 8 MB.", 0, false);

            var head = new byte[16];
            int read;
            await using (var peek = file.OpenReadStream())
                read = await peek.ReadAsync(head.AsMemory(0, head.Length), ct);
            var kind = ReceiptImage.Sniff(head.AsSpan(0, read));
            if (kind == null)
                return new Result("Only photos are accepted (JPEG, PNG, WebP or HEIC).", 0, false);
            checkedFiles.Add((file, kind.Value.ContentType, kind.Value.Extension));
        }

        var now = DateTime.UtcNow;
        var stored = new List<OrderMakingPhoto>();
        foreach (var (file, contentType, extension) in checkedFiles)
        {
            Stream content;
            var type = contentType;
            var ext = extension;
            if (contentType == "image/heic")
            {
                // The image library cannot read HEIC: it is kept as uploaded.
                content = file.OpenReadStream();
            }
            else
            {
                try
                {
                    await using var input = file.OpenReadStream();
                    var normalized = await _normalizer.NormalizeAsync(input, ct);
                    content = normalized.Output;
                    type = normalized.ContentType;
                    ext = normalized.FileExtension;
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    await RollbackAsync(stored, ct);
                    return new Result("One of the files is not a readable image.", 0, false);
                }
            }

            var key = $"making/{order.Id}-{Guid.NewGuid():N}{ext}";
            await using (content)
                await _storage.PutPrivateAsync(content, type, key, ct);
            var photo = new OrderMakingPhoto { OrderId = order.Id, StorageKey = key, ContentType = type, CreatedAt = now };
            stored.Add(photo);
            _db.OrderMakingPhotos.Add(photo);
        }

        var notify = order.PhotosRequestedAt != null && order.PhotosNotifiedAt == null;
        if (notify)
            order.PhotosNotifiedAt = now;
        order.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);
        return new Result(null, stored.Count, notify);
    }

    private async Task RollbackAsync(List<OrderMakingPhoto> stored, CancellationToken ct)
    {
        foreach (var photo in stored)
        {
            _db.OrderMakingPhotos.Remove(photo);
            await _storage.DeletePrivateAsync(photo.StorageKey, ct);
        }
    }
}
