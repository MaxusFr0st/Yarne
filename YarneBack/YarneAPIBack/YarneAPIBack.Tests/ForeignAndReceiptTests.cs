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

    // ---- euro payment (delivery abroad) --------------------------------------------------------

    [Fact]
    public void EurTotal_IsSummedFromTheLinesEuroSnapshots_AndRefusedWhenAnyLineHasNone()
    {
        var items = new[]
        {
            new OrderItem { EurUnitPrice = 25m, Quantity = 2, UnitPrice = 1150m },
            new OrderItem { EurUnitPrice = 49.99m, Quantity = 1, UnitPrice = 2400m },
        };
        var ok = ForeignDelivery.EurTotalCents(items);
        Assert.Null(ok.Error);
        Assert.Equal(9999L, ok.Cents);

        Assert.NotNull(ForeignDelivery.EurTotalCents(new[] { new OrderItem { EurUnitPrice = null, Quantity = 1 } }).Error);
        Assert.NotNull(ForeignDelivery.EurTotalCents(new[] { new OrderItem { EurUnitPrice = 0m, Quantity = 1 } }).Error);
    }

    [Fact]
    public async Task StatusDto_ForAnEurOrder_ShowsEuroAmountsAndTheEurDetails_OrNoneWhenTheyAreNotFilledIn()
    {
        var settings = new NoSettings();
        var order = NewOrder(foreign: true);
        order.PaymentCurrency = "EUR";
        order.EurTotalCents = 2500;
        order.TotalCents = 115000;
        order.PaymentChoice = "Transfer";
        order.Status = "Accepted";
        order.OrderNumber = "Y1-1";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var dto = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>((await _controller.Get(order.StatusToken!)).Result).Value!;
        Assert.Equal("EUR", dto.PaymentCurrency);
        Assert.Equal(25m, dto.EurTotal);
        Assert.Null(dto.TransferDetails); // no euro details saved yet: the page says they will be emailed

        const string json = """
            {"recipient":"УАН","cardNumber":"4441","reference":"Оплата {{order}}",
             "eur":{"recipient":"Anna Kowal","iban":"DE89 3704 0044 0532 0130 00","swift":"COBADEFF","bankName":"Commerzbank","bankAddress":"","reference":"Order {{order}} {{x}}","note":"Fees are on you"}}
            """;
        var eur = OrderStatusController.ExtractTransferDetails(json, "Y1-1", eur: true)!;
        Assert.Equal("EUR", eur.Currency);
        Assert.Equal("Anna Kowal", eur.Recipient);
        Assert.Equal("DE89 3704 0044 0532 0130 00", eur.Iban);
        Assert.Equal("COBADEFF", eur.Swift);
        Assert.Equal("Commerzbank", eur.BankName);
        Assert.Equal("Order Y1-1", eur.Reference);
        Assert.Equal("Fees are on you", eur.Note);
        Assert.Equal("", eur.CardNumber); // never the hryvnia card

        // A saved setting with no euro group (every old one) simply has no euro details; the UAH details are untouched.
        Assert.Null(OrderStatusController.ExtractTransferDetails("""{"recipient":"A","cardNumber":"1"}""", "Y1-1", eur: true));
        Assert.Equal("1", OrderStatusController.ExtractTransferDetails("""{"recipient":"A","cardNumber":"1"}""", "Y1-1")!.CardNumber);
        _ = settings;
    }

    [Fact]
    public void EurEmails_ShowEuroOnly_AndUahEmailsStayInHryvnia()
    {
        var uah = new OrderConfirmationEmailMessage
        {
            OrderId = 1, OrderNumber = "Y1-1", Event = OrderEmailEvent.Confirmed, CustomerName = "A", Total = 1150m, EurTotal = 25m,
            Items = [new OrderConfirmationEmailItem { ProductName = "Bag", UnitPrice = 1150m, EurUnitPrice = 25m, Quantity = 1 }],
        };
        var uahHtml = OrderConfirmationEmailBuilder.BuildHtml(uah);
        Assert.Contains(HryvniaPriceFormatter.Sign, uahHtml);
        Assert.DoesNotContain("€", uahHtml); // Ukrainian-language UAH order: unchanged

        var eur = new OrderConfirmationEmailMessage
        {
            OrderId = 1, OrderNumber = "Y1-1", Event = OrderEmailEvent.Confirmed, CustomerName = "A", Total = 1150m, EurTotal = 25m, PaymentCurrency = "EUR", IsForeignDelivery = true,
            Items = [new OrderConfirmationEmailItem { ProductName = "Bag", UnitPrice = 1150m, EurUnitPrice = 25m, Quantity = 1 }],
        };
        foreach (var e in new[] { OrderEmailEvent.Received, OrderEmailEvent.Confirmed, OrderEmailEvent.PaymentConfirmed })
        {
            eur.Event = e;
            var html = OrderConfirmationEmailBuilder.BuildHtml(eur);
            Assert.Contains("€25.00", html);
            Assert.DoesNotContain(HryvniaPriceFormatter.Sign, html);
        }

        eur.Event = OrderEmailEvent.InternalReceiptUploaded;
        eur.CustomerEmail = "a@b.c";
        Assert.Contains("€25.00 (EUR, за кордон)", OrderConfirmationEmailBuilder.BuildHtml(eur));
        eur.Event = OrderEmailEvent.InternalPlacedNotification;
        Assert.Contains("(EUR, за кордон)", OrderConfirmationEmailBuilder.BuildHtml(eur));
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
    public async Task Claim_StoresTheReceiptPrivately_Once_AndNeverReplacedByTheCustomer()
    {
        var order = NewOrder();
        order.PaymentChoice = "Transfer";
        order.Status = "Accepted";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        Assert.Empty(_storage.Files); // nothing is stored before the claim

        var first = await _controller.ClaimPayment(order.StatusToken!, Upload(Jpeg(), "receipt.jpg"));
        var dto = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>(first.Result).Value!;
        Assert.NotNull(dto.PaymentClaimedAt);
        Assert.NotNull(dto.ReceiptUploadedAt);
        Assert.False(dto.CanClaimPayment);
        var saved = await _db.Orders.AsNoTracking().SingleAsync();
        Assert.StartsWith("receipts/", saved.ReceiptKey);
        Assert.DoesNotContain("http", saved.ReceiptKey);
        Assert.Single(_storage.Files);

        // One claim per order: a second one (a replacement, a repeat) is refused and stores nothing.
        Assert.IsType<ConflictObjectResult>((await _controller.ClaimPayment(order.StatusToken!, Upload(Jpeg(), "again.jpg"))).Result);
        Assert.Single(_storage.Files);
        Assert.Equal(0, _storage.Deleted);
    }

    [Fact]
    public async Task Claim_RefusesAMissingPhoto_ANonImage_ATooLargeFile_AndOrdersThatAreNotWaiting()
    {
        var order = NewOrder();
        order.PaymentChoice = "Transfer";
        order.Status = "Accepted";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        Assert.IsType<BadRequestObjectResult>((await _controller.ClaimPayment(order.StatusToken!, null)).Result);
        Assert.IsType<BadRequestObjectResult>((await _controller.ClaimPayment(order.StatusToken!, Upload("%PDF-1.4"u8.ToArray(), "scan.jpg"))).Result);
        Assert.IsType<BadRequestObjectResult>((await _controller.ClaimPayment(order.StatusToken!, Upload(new byte[(int)ReceiptImage.MaxBytes + 1], "big.jpg"))).Result);
        Assert.Empty(_storage.Files);

        foreach (var status in new[] { "Shipped", "Received", "Canceled" })
        {
            var o = NewOrder();
            o.PaymentChoice = "Transfer";
            o.Status = status;
            _db.Orders.Add(o);
            await _db.SaveChangesAsync();
            Assert.IsType<ConflictObjectResult>((await _controller.ClaimPayment(o.StatusToken!, Upload(Jpeg(), "x.jpg"))).Result);
        }

        var pickup = NewOrder();
        pickup.PaymentChoice = "Pickup";
        pickup.Status = "Accepted";
        _db.Orders.Add(pickup);
        await _db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>((await _controller.ClaimPayment(pickup.StatusToken!, Upload(Jpeg(), "x.jpg"))).Result);
        Assert.IsType<NotFoundResult>((await _controller.ClaimPayment(OrderPublicIdentifiers.NewStatusToken(), Upload(Jpeg(), "x.jpg"))).Result);
        Assert.Empty(_storage.Files);
    }

    [Theory]
    [InlineData("Shipped")]
    [InlineData("Received")]
    [InlineData("Canceled")]
    public async Task PaymentChoice_IsRefusedOnceTheOrderHasLeftTheChoosingStage(string status)
    {
        var order = NewOrder();
        order.Status = status;
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>((await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "transfer" })).Result);
        Assert.Null((await _db.Orders.AsNoTracking().SingleAsync()).PaymentChoice);
    }

    [Theory]
    [InlineData("Оплата замовлення {{order}}", "Оплата замовлення Y1-1")]
    [InlineData("{{ ORDER }} / дякуємо", "Y1-1 / дякуємо")]
    [InlineData("Order {{order}} {{unknown}} {{ x y }}", "Order Y1-1")]
    [InlineData("{{unknown}}", "")]
    [InlineData("", "")]
    [InlineData("   ", "")]
    public void Reference_PutsTheOrderNumberIn_StripsOtherPlaceholders_AndEmptyMeansNoRow(string template, string expected)
        => Assert.Equal(expected, OrderStatusController.ResolveReference(template, "Y1-1"));

    [Fact]
    public void ForeignOrder_GetsTransferAutomatically_WhenAccepted_NotBefore_NotForDomestic()
    {
        var o = NewOrder();
        o.IsForeignDelivery = true;
        o.Status = "Pending";
        Assert.False(ForeignDelivery.ApplyAutoTransfer(o));
        o.Status = "Accepted";
        Assert.True(ForeignDelivery.ApplyAutoTransfer(o));
        Assert.Equal("Transfer", o.PaymentChoice);
        Assert.False(ForeignDelivery.ApplyAutoTransfer(o));

        var home = NewOrder();
        home.Status = "Accepted";
        Assert.False(ForeignDelivery.ApplyAutoTransfer(home));
        Assert.Null(home.PaymentChoice);
    }

    [Fact]
    public async Task StatusPage_SetsTransferQuietlyForAnAcceptedForeignOrder()
    {
        var o = NewOrder();
        o.IsForeignDelivery = true;
        o.Status = "Accepted";
        _db.Orders.Add(o);
        await _db.SaveChangesAsync();
        await _controller.Get(o.StatusToken!);
        Assert.Equal("Transfer", (await _db.Orders.SingleAsync()).PaymentChoice);
    }

    [Fact]
    public void EmailThreading_FirstEmailHasStableId_LaterOnesReplyToIt_OwnerIsSeparate()
    {
        var first = new OrderConfirmationEmailMessage { OrderId = 7, OrderNumber = "Y1-1", Event = OrderEmailEvent.Received };
        var later = new OrderConfirmationEmailMessage { OrderId = 7, OrderNumber = "Y1-1", Event = OrderEmailEvent.Shipped };
        var owner = new OrderConfirmationEmailMessage { OrderId = 7, OrderNumber = "Y1-1", Event = OrderEmailEvent.InternalPlacedNotification };
        var a = EmailThreading.For(first, "Yarné <shop@yarne-acc.com>");
        var b = EmailThreading.For(later, "Yarné <shop@yarne-acc.com>");
        var c = EmailThreading.For(owner, "Yarné <shop@yarne-acc.com>");
        Assert.Equal("<order-7-customer-root@yarne-acc.com>", a.MessageId);
        Assert.Null(a.InReplyTo);
        Assert.Equal(a.MessageId, b.InReplyTo);
        Assert.Equal(a.MessageId, b.References);
        Assert.NotEqual(a.MessageId, c.MessageId);
        Assert.Equal("[Адмін] Замовлення Y1-1", OrderConfirmationEmailBuilder.BuildSubject(owner));
    }

    [Fact]
    public async Task OwnerIsEmailedOncePerClaim_AndOncePerChoice()
    {
        Environment.SetEnvironmentVariable("ORDER_RECEIVED_NOTIFY_EMAIL", "owner@example.com");
        try
        {
            var mail = new CountingEmail();
            var cfg = new ConfigurationBuilder().Build();
            var controller = new OrderStatusController(_db, new NoSettings(), cfg, new OrderNotifier(mail, cfg, NullLogger<OrderNotifier>.Instance), _storage)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
            };
            var order = NewOrder();
            order.Status = "Accepted";
            _db.Orders.Add(order);
            await _db.SaveChangesAsync();

            await controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "transfer" });
            await controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "transfer" }); // idempotent: no second email
            await controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "pickup" }); // refused: no email
            await controller.ClaimPayment(order.StatusToken!, Upload(Jpeg(), "r.jpg"));
            await controller.ClaimPayment(order.StatusToken!, Upload(Jpeg(), "r2.jpg")); // refused: no email
            await Task.Delay(300);

            Assert.Equal(new[] { OrderEmailEvent.InternalPaymentChosen }, mail.Events.OrderBy(e => (int)e).ToArray());
            Assert.All(mail.Messages, m => Assert.Contains("/admin?order=", m.AdminUrl));

            // The owner resets the choice (as the admin endpoint does); a new choice notifies again.
            var tracked = await _db.Orders.SingleAsync();
            tracked.PaymentChoice = null;
            tracked.PaymentClaimedAt = null;
            await _db.SaveChangesAsync();
            await controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "pickup" });
            await Task.Delay(300);
            Assert.Equal(2, mail.Events.Count(e => e == OrderEmailEvent.InternalPaymentChosen));
        }
        finally
        {
            Environment.SetEnvironmentVariable("ORDER_RECEIVED_NOTIFY_EMAIL", null);
        }
    }

    [Fact]
    public void OwnerNotices_OpenTheAdmin_WithTheStatusLinkOnlyAsASmallLine()
    {
        var message = new OrderConfirmationEmailMessage
        {
            OrderId = 5, OrderNumber = "Y1-1", Event = OrderEmailEvent.InternalReceiptUploaded, CustomerName = "A", CustomerEmail = "a@b.c", Total = 10m,
            AdminUrl = "https://yarne-acc.com/admin?order=5", StatusUrl = "https://yarne-acc.com/uk/order/SECRETTOKEN",
        };
        foreach (var e in new[] { OrderEmailEvent.InternalReceiptUploaded, OrderEmailEvent.InternalPaymentChosen, OrderEmailEvent.InternalPlacedNotification })
        {
            message.Event = e;
            var html = OrderConfirmationEmailBuilder.BuildHtml(message);
            Assert.Contains("href=\"https://yarne-acc.com/admin?order=5\"", html);
            Assert.True(html.IndexOf("/admin?order=5", StringComparison.Ordinal) < html.IndexOf("SECRETTOKEN", StringComparison.Ordinal));
            Assert.Contains("Відкрити в адмінці", html);
        }
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
        Assert.False(dto.CanClaimPayment);
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

    internal sealed class CountingEmail : IEmailService
    {
        public List<OrderConfirmationEmailMessage> Messages { get; } = [];
        public IEnumerable<OrderEmailEvent> Events => Messages.Select(m => m.Event);
        public Task SendOrderConfirmationAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) { lock (Messages) Messages.Add(message); return Task.CompletedTask; }
        public Task SendOrderReceiptAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
        public Task SendPasswordResetAsync(PasswordResetEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
    }

    internal sealed class NoEmail : IEmailService
    {
        public Task SendOrderConfirmationAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
        public Task SendOrderReceiptAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
        public Task SendPasswordResetAsync(PasswordResetEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
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
