using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Controllers;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Tests;

public class MakingPhotosTests : IDisposable
{
    private readonly YarneDbContext _db = new(new DbContextOptionsBuilder<YarneDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private readonly Store _storage = new();
    private readonly MakingPhotoUploads _uploads;

    public MakingPhotosTests() => _uploads = new MakingPhotoUploads(_db, _storage, new PassThrough());

    public void Dispose() => _db.Dispose();

    private static byte[] Jpeg() => new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

    private static IFormFile File(byte[] bytes, string name = "p.jpg") => new FormFile(new MemoryStream(bytes), 0, bytes.Length, "files", name);

    private async Task<Order> NewOrderAsync(string status = "Accepted", int? customerId = 7, DateTime? requestedAt = null)
    {
        var order = new Order
        {
            Status = status, CustomerId = customerId, StatusToken = OrderPublicIdentifiers.NewStatusToken(), OrderDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, CurrencyCode = "UAH", PhotosRequestedAt = requestedAt,
        };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        return order;
    }

    private OrderMakingPhotosController Controller(int? customerId)
    {
        var claims = customerId == null ? [] : new[] { new Claim(ClaimTypes.NameIdentifier, customerId.Value.ToString()) };
        return new OrderMakingPhotosController(_db, _storage)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test")) } },
        };
    }

    [Fact]
    public async Task OnlyTheOwningAccountCanAsk_ListOrOpen_GuestAndOtherAccountAreRefused()
    {
        var order = await NewOrderAsync();
        Assert.IsType<NotFoundResult>((await Controller(7).List("short")).Result);
        Assert.Equal(403, ((StatusCodeResult)(await Controller(8).List(order.StatusToken!)).Result!).StatusCode);
        Assert.Equal(403, ((StatusCodeResult)(await Controller(null).Request(order.StatusToken!)).Result!).StatusCode);
        Assert.Equal(403, ((StatusCodeResult)await Controller(8).Image(order.StatusToken!, 1)).StatusCode);
        Assert.Null((await _db.Orders.SingleAsync()).PhotosRequestedAt);
    }

    [Fact]
    public async Task Request_IsOnlyForTheMakingStages_AndIdempotent()
    {
        foreach (var status in new[] { "Pending", "Shipped", "Received", "Canceled" })
        {
            var o = await NewOrderAsync(status);
            Assert.IsType<ConflictObjectResult>((await Controller(7).Request(o.StatusToken!)).Result);
        }

        var order = await NewOrderAsync("InProduction");
        Assert.IsType<OkObjectResult>((await Controller(7).Request(order.StatusToken!)).Result);
        var first = (await _db.Orders.FirstAsync(o => o.Id == order.Id)).PhotosRequestedAt;
        Assert.NotNull(first);
        Assert.IsType<OkObjectResult>((await Controller(7).Request(order.StatusToken!)).Result);
        Assert.Equal(first, (await _db.Orders.FirstAsync(o => o.Id == order.Id)).PhotosRequestedAt);
    }

    [Fact]
    public async Task FivePhotosAtMost_BadFilesAndHugeFilesRefused_NothingStoredOnRefusal()
    {
        var order = await NewOrderAsync();
        Assert.Null((await _uploads.AddAsync(order, [File(Jpeg()), File(Jpeg()), File(Jpeg())], default)).Error);
        Assert.NotNull((await _uploads.AddAsync(order, [File(Jpeg()), File(Jpeg()), File(Jpeg())], default)).Error); // 6 > 5
        Assert.Equal(3, await _db.OrderMakingPhotos.CountAsync());

        Assert.NotNull((await _uploads.AddAsync(order, [File("%PDF-1.4"u8.ToArray())], default)).Error);
        Assert.NotNull((await _uploads.AddAsync(order, [File(new byte[MakingPhotos.MaxBytes + 1].Select((_, i) => i < 3 ? (byte)0xFF : (byte)0).ToArray())], default)).Error);
        Assert.Null((await _uploads.AddAsync(order, [File(Jpeg()), File(Jpeg())], default)).Error);
        Assert.Equal(5, await _db.OrderMakingPhotos.CountAsync());
        Assert.All(_storage.Files.Keys, k => Assert.StartsWith($"making/{order.Id}-", k));
    }

    [Fact]
    public async Task TheCustomerIsToldOnce_OnlyIfTheyAsked()
    {
        var asked = await NewOrderAsync(requestedAt: DateTime.UtcNow);
        Assert.True((await _uploads.AddAsync(asked, [File(Jpeg())], default)).NotifyCustomer);
        Assert.NotNull(asked.PhotosNotifiedAt);
        Assert.False((await _uploads.AddAsync(asked, [File(Jpeg())], default)).NotifyCustomer);

        var unasked = await NewOrderAsync();
        Assert.False((await _uploads.AddAsync(unasked, [File(Jpeg())], default)).NotifyCustomer);
    }

    [Fact]
    public async Task OwnerSeesAndStreamsPhotosNoStore_PublicStatusExposesOnlyCounts()
    {
        var order = await NewOrderAsync(requestedAt: DateTime.UtcNow);
        await _uploads.AddAsync(order, [File(Jpeg())], default);
        var controller = Controller(7);
        var list = (MakingPhotosDto)((OkObjectResult)(await controller.List(order.StatusToken!)).Result!).Value!;
        Assert.Single(list.Photos);
        var image = await controller.Image(order.StatusToken!, list.Photos[0].Id);
        Assert.IsType<FileStreamResult>(image);
        Assert.Equal("private, no-store", controller.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task PhotosAreDeletedWithTheirFiles_OnReceivedAndCanceled_AndBySafetyNet()
    {
        var done = await NewOrderAsync("Accepted");
        await _uploads.AddAsync(done, [File(Jpeg()), File(Jpeg())], default);
        Assert.Equal(2, await MakingPhotos.DeleteForOrderAsync(_db, _storage, done.Id, default));
        Assert.Empty(_storage.Files);
        Assert.Equal(0, await _db.OrderMakingPhotos.CountAsync());

        var missed = await NewOrderAsync("Accepted");
        await _uploads.AddAsync(missed, [File(Jpeg())], default);
        missed.Status = "Received";
        var other = await NewOrderAsync("Canceled");
        _db.OrderMakingPhotos.Add(new OrderMakingPhoto { OrderId = other.Id, StorageKey = "making/x.jpg", ContentType = "image/jpeg", CreatedAt = DateTime.UtcNow });
        var live = await NewOrderAsync("Made");
        await _uploads.AddAsync(live, [File(Jpeg())], default);
        await _db.SaveChangesAsync();

        Assert.Equal(2, await MakingPhotos.DeleteForFinishedOrdersAsync(_db, _storage, default));
        Assert.Equal(1, await _db.OrderMakingPhotos.CountAsync());
        Assert.False((await _uploads.AddAsync(missed, [File(Jpeg())], default)).Error == null); // finished: no more uploads
    }

    private sealed class PassThrough : IImageUploadNormalizer
    {
        public Task<NormalizedUploadImage> NormalizeAsync(Stream input, CancellationToken ct = default)
        {
            var copy = new MemoryStream();
            input.CopyTo(copy);
            copy.Position = 0;
            return Task.FromResult(new NormalizedUploadImage { Output = copy, FileExtension = ".jpg", ContentType = "image/jpeg" });
        }
    }

    private sealed class Store : IR2ImageStorageService
    {
        public Dictionary<string, byte[]> Files { get; } = [];
        public bool IsConfigured => true;
        public Task<string> UploadAsync(Stream content, string contentType, string fileExtension, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<string> UploadWithKeyAsync(Stream content, string contentType, string key, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<bool> ExistsAsync(string key, CancellationToken ct = default) => Task.FromResult(Files.ContainsKey(key));
        public string BuildPublicUrl(string key) => throw new NotSupportedException("photos must never get a public URL");
        public Task DeleteAsync(string? publicUrl, CancellationToken ct = default) => Task.CompletedTask;
        public Task PutPrivateAsync(Stream content, string contentType, string key, CancellationToken ct = default)
        {
            using var ms = new MemoryStream();
            content.CopyTo(ms);
            Files[key] = ms.ToArray();
            return Task.CompletedTask;
        }

        public Task<(Stream Content, string ContentType)?> GetPrivateAsync(string key, CancellationToken ct = default)
            => Task.FromResult<(Stream, string)?>(Files.TryGetValue(key, out var b) ? (new MemoryStream(b), "image/jpeg") : null);

        public Task DeletePrivateAsync(string key, CancellationToken ct = default) { Files.Remove(key); return Task.CompletedTask; }
    }
}
