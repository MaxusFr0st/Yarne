using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using YarneAPIBack.Configuration;
using YarneAPIBack.Controllers;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Tests;

public class ForeignAndReceiptTests : IDisposable
{
    private readonly YarneDbContext _db;
    private readonly FakeStorage _storage = new();
    private readonly OrderStatusController _controller;

    public ForeignAndReceiptTests()
    {
        _db = new YarneDbContext(new DbContextOptionsBuilder<YarneDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var config = new ConfigurationBuilder().Build();
        var notifier = new OrderNotifier(new NoEmail(), config, NullLogger<OrderNotifier>.Instance);
        _controller = new OrderStatusController(_db, new NoSettings(), config, notifier, _storage)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };
    }

    public void Dispose() => _db.Dispose();

    // ---- countries ---------------------------------------------------------------------

    [Theory]
    [InlineData("RU", "")]
    [InlineData("ru", "Anything")]
    [InlineData("BY", "")]
    [InlineData("", "Russia")]
    [InlineData("", "Російська Федерація")]
    [InlineData("", "россия")]
    [InlineData("", "Belarus")]
    [InlineData("", "Білорусь")]
    [InlineData("", "Беларусь")]
    [InlineData("", "РФ")]
    public void RussiaAndBelarus_AreRefused_ByCodeAndByAnySpellingTypedIn(string code, string name)
    {
        var (error, _, _, _) = ForeignDelivery.Validate(code, name, "Other", null, "City", "Street 1");
        Assert.NotNull(error);
    }

    [Fact]
    public void Validate_AcceptsAListedCountryWithABranch_AndAnOtherCountryWithAnAddress()
    {
        var np = ForeignDelivery.Validate("pl", "Polska", "NovaPost", "branch-1", "Warsaw", null);
        Assert.Null(np.Error);
        Assert.Equal(("PL", "Poland", "NovaPost"), (np.Code, np.Name, np.Carrier));

        var other = ForeignDelivery.Validate("", "Norway", "Other", null, "Oslo", "Storgata 1");
        Assert.Null(other.Error);
        Assert.Equal("Other", other.Carrier);

        Assert.NotNull(ForeignDelivery.Validate("PL", "", "NovaPost", "", "Warsaw", null).Error); // no branch
        Assert.NotNull(ForeignDelivery.Validate("", "Norway", "NovaPost", "b", "Oslo", null).Error); // unlisted country has no Nova Post
        Assert.NotNull(ForeignDelivery.Validate("", "Norway", "Other", null, "Oslo", "").Error); // no address
        Assert.NotNull(ForeignDelivery.Validate("", "", "Other", null, "Oslo", "x").Error); // no country
    }

    [Fact]
    public void TheCountryList_HasTheSixteenCountries_WithoutRussiaOrBelarus()
    {
        Assert.Equal(16, ForeignDelivery.NovaPostCountries.Count);
        Assert.DoesNotContain(ForeignDelivery.NovaPostCountries, c => c.Code is "RU" or "BY");
        Assert.All(ForeignDelivery.NovaPostCountries, c => Assert.StartsWith("+", c.DialCode));
    }

    // ---- foreign orders -------------------------------------------------------------------

    [Fact]
    public async Task ForeignOrders_CanOnlyChooseTransfer()
    {
        var order = NewOrder(foreign: true);
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        Assert.IsType<BadRequestObjectResult>((await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "pickup" })).Result);
        Assert.IsType<OkObjectResult>((await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "transfer" })).Result);
    }

    [Fact]
    public async Task StatusPage_ShowsTheForeignDeliveryDetails()
    {
        var order = NewOrder(foreign: true);
        order.DeliveryCountryName = "Poland";
        order.DeliveryCarrier = "NovaPost";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var dto = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>((await _controller.Get(order.StatusToken!)).Result).Value!;
        Assert.True(dto.IsForeignDelivery);
        Assert.Equal("Poland", dto.DeliveryCountryName);
        Assert.Equal("NovaPost", dto.DeliveryCarrier);
        Assert.Equal("Poland, Warsaw, Branch 5", OrderLinks.DeliverySummary(order));
    }

    // ---- strap ---------------------------------------------------------------------------

    [Fact]
    public void NoStrapIsNotPrinted_ForProductsWithoutAStrapOption()
    {
        var hat = new OrderItem { WithLace = false, Product = new Product { Lace = false } };
        var bag = new OrderItem { WithLace = false, Product = new Product { Lace = true } };
        var bagWith = new OrderItem { WithLace = true, Product = new Product { Lace = true } };
        var gone = new OrderItem { WithLace = false };

        Assert.Null(OrderItemSnapshotHelper.ResolveWithLace(hat));
        Assert.False(OrderItemSnapshotHelper.ResolveWithLace(bag));
        Assert.True(OrderItemSnapshotHelper.ResolveWithLace(bagWith));
        Assert.Null(OrderItemSnapshotHelper.ResolveWithLace(gone));
    }

    // ---- receipts ---------------------------------------------------------------------------

    [Fact]
    public void ReceiptImage_IsRecognisedByContent_NotByName()
    {
        Assert.Equal("image/jpeg", ReceiptImage.Sniff(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0 })!.Value.ContentType);
        Assert.Equal("image/png", ReceiptImage.Sniff(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0 })!.Value.ContentType);
        Assert.Equal("image/webp", ReceiptImage.Sniff("RIFF\0\0\0\0WEBP"u8.ToArray())!.Value.ContentType);
        Assert.Equal("image/heic", ReceiptImage.Sniff("\0\0\0\u0018ftypheic"u8.ToArray())!.Value.ContentType);
        Assert.Null(ReceiptImage.Sniff("%PDF-1.4 not an image"u8.ToArray()));
        Assert.Null(ReceiptImage.Sniff("<svg xmlns=\"http://www.w3.org/2000/svg\"/>"u8.ToArray()));
        Assert.Null(ReceiptImage.Sniff(Array.Empty<byte>()));
    }

    [Fact]
    public async Task Receipt_IsStoredPrivately_ReplacedAndRefusedWhenNotAllowed()
    {
        var order = NewOrder();
        order.PaymentChoice = "Transfer";
        order.Status = "Accepted";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var first = await _controller.UploadReceipt(order.StatusToken!, Upload(Jpeg(), "receipt.jpg"));
        var dto = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>(first.Result).Value!;
        Assert.NotNull(dto.ReceiptUploadedAt);
        Assert.True(dto.CanUploadReceipt);
        var saved = await _db.Orders.AsNoTracking().SingleAsync();
        Assert.StartsWith("receipts/", saved.ReceiptKey);
        Assert.DoesNotContain("http", saved.ReceiptKey);
        Assert.Single(_storage.Files);

        // A second upload replaces the first file.
        await _controller.UploadReceipt(order.StatusToken!, Upload(Jpeg(), "again.jpg"));
        Assert.Single(_storage.Files);
        Assert.Equal(1, _storage.Deleted);

        // Not an image, whatever its name says; too large; wrong order state.
        Assert.IsType<BadRequestObjectResult>((await _controller.UploadReceipt(order.StatusToken!, Upload("%PDF-1.4"u8.ToArray(), "scan.jpg"))).Result);
        Assert.IsType<BadRequestObjectResult>((await _controller.UploadReceipt(order.StatusToken!, Upload(new byte[(int)ReceiptImage.MaxBytes + 1], "big.jpg"))).Result);

        var tracked = await _db.Orders.SingleAsync();
        tracked.PaymentReceivedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>((await _controller.UploadReceipt(order.StatusToken!, Upload(Jpeg(), "late.jpg"))).Result);

        var pickup = NewOrder();
        pickup.PaymentChoice = "Pickup";
        pickup.Status = "Accepted";
        _db.Orders.Add(pickup);
        await _db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>((await _controller.UploadReceipt(pickup.StatusToken!, Upload(Jpeg(), "x.jpg"))).Result);
        Assert.IsType<NotFoundResult>((await _controller.UploadReceipt(OrderPublicIdentifiers.NewStatusToken(), Upload(Jpeg(), "x.jpg"))).Result);
    }

    [Fact]
    public async Task PaymentConfirmed_FreezesTheChoice_AndShowsOnTheStatusPage()
    {
        var order = NewOrder();
        order.PaymentChoice = "Transfer";
        order.Status = "Accepted";
        order.PaymentReceivedAt = new DateTime(2026, 10, 7, 9, 0, 0, DateTimeKind.Utc);
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var dto = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>((await _controller.Get(order.StatusToken!)).Result).Value!;
        Assert.Equal(order.PaymentReceivedAt, dto.PaymentReceivedAt);
        Assert.False(dto.CanUploadReceipt);
        Assert.IsType<ConflictObjectResult>((await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "pickup" })).Result);
    }

    [Fact]
    public async Task Cleanup_DeletesReceiptsThirtyDaysAfterTheOrderFinished_AndOnlyThen()
    {
        var now = new DateTime(2026, 11, 10, 0, 0, 0, DateTimeKind.Utc);
        Order Make(DateTime? finished) { var o = NewOrder(); o.ReceiptKey = "receipts/" + Guid.NewGuid(); o.FinalizedAt = finished; return o; }
        var old = Make(now.AddDays(-31));
        var recent = Make(now.AddDays(-29));
        var open = Make(null);
        _db.Orders.AddRange(old, recent, open);
        await _db.SaveChangesAsync();

        var removed = await ReceiptCleanupService.DeleteExpiredAsync(_db, _storage, now, CancellationToken.None);

        Assert.Equal(1, removed);
        var rows = await _db.Orders.AsNoTracking().ToListAsync();
        Assert.Null(rows.Single(o => o.Id == old.Id).ReceiptKey);
        Assert.NotNull(rows.Single(o => o.Id == recent.Id).ReceiptKey);
        Assert.NotNull(rows.Single(o => o.Id == open.Id).ReceiptKey);
    }

    // ---- helpers ---------------------------------------------------------------------------

    private static byte[] Jpeg() => new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

    private static IFormFile Upload(byte[] bytes, string name)
        => new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", name);

    private static Order NewOrder(bool foreign = false) => new()
    {
        Status = "Pending",
        StatusToken = OrderPublicIdentifiers.NewStatusToken(),
        OrderDate = DateTime.UtcNow,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        CurrencyCode = "UAH",
        IsForeignDelivery = foreign,
        DeliveryCityName = "Warsaw",
        DeliveryWarehouseName = "Branch 5",
    };

    private sealed class NoSettings : IStorefrontSettingsService
    {
        public bool IsAllowedKey(string key) => true;
        public Task<string?> GetValueJsonAsync(string key, CancellationToken ct = default) => Task.FromResult<string?>(null);
        public Task<string> UpsertValueJsonAsync(string key, string valueJson, CancellationToken ct = default) => Task.FromResult(valueJson);
    }

    internal sealed class NoEmail : IEmailService
    {
        public Task SendOrderConfirmationAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
        public Task SendOrderReceiptAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
    }

    internal sealed class FakeStorage : IR2ImageStorageService
    {
        public HashSet<string> Files { get; } = [];
        public int Deleted { get; private set; }
        public bool IsConfigured => true;
        public Task<string> UploadAsync(Stream content, string contentType, string fileExtension, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<string> UploadWithKeyAsync(Stream content, string contentType, string key, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<bool> ExistsAsync(string key, CancellationToken ct = default) => Task.FromResult(Files.Contains(key));
        public string BuildPublicUrl(string key) => throw new NotSupportedException("receipts must never get a public URL");
        public Task DeleteAsync(string? publicUrl, CancellationToken ct = default) => Task.CompletedTask;
        public Task PutPrivateAsync(Stream content, string contentType, string key, CancellationToken ct = default) { Files.Add(key); return Task.CompletedTask; }
        public Task<(Stream Content, string ContentType)?> GetPrivateAsync(string key, CancellationToken ct = default) => Task.FromResult<(Stream, string)?>(null);
        public Task DeletePrivateAsync(string key, CancellationToken ct = default) { if (Files.Remove(key)) Deleted++; return Task.CompletedTask; }
    }
}
