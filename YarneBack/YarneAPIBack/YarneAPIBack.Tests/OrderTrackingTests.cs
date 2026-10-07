using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using YarneAPIBack.Controllers;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Tests;

public class OrderTrackingTests : IDisposable
{
    private readonly YarneDbContext _db;
    private readonly FakeSettings _settings = new();
    private readonly OrderStatusController _controller;

    public OrderTrackingTests()
    {
        var options = new DbContextOptionsBuilder<YarneDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new YarneDbContext(options);
        var cfg = new ConfigurationBuilder().Build(); _controller = new OrderStatusController(_db, _settings, cfg, new OrderNotifier(new ForeignAndReceiptTests.NoEmail(), cfg, NullLogger<OrderNotifier>.Instance), new ForeignAndReceiptTests.FakeStorage())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };
    }

    public void Dispose() => _db.Dispose();

    // ---- identifiers -------------------------------------------------------------------

    [Fact]
    public void StatusToken_IsLongUrlSafeAndDifferentEachTime()
    {
        var tokens = Enumerable.Range(0, 50).Select(_ => OrderPublicIdentifiers.NewStatusToken()).ToList();

        Assert.Equal(50, tokens.Distinct().Count());
        Assert.All(tokens, token =>
        {
            Assert.True(token.Length >= 43); // 32 random bytes
            Assert.True(OrderPublicIdentifiers.LooksLikeStatusToken(token));
            Assert.DoesNotContain('+', token);
            Assert.DoesNotContain('/', token);
            Assert.DoesNotContain('=', token);
        });
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("short")]
    [InlineData("../../etc/passwd-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")]
    public void LooksLikeStatusToken_RejectsWhatCannotBeAToken(string? value)
        => Assert.False(OrderPublicIdentifiers.LooksLikeStatusToken(value));

    [Fact]
    public async Task OrderNumber_IsYDayCountFormat_InKyivTime_AndCountsUpPerDay()
    {
        // 21:30 UTC on 6 Oct is already 7 Oct in Kyiv (UTC+3 in summer time).
        var evening = new DateTime(2026, 10, 6, 21, 30, 0, DateTimeKind.Utc);
        Assert.Equal("Y071026", OrderPublicIdentifiers.DayPrefix(evening));

        var first = await OrderPublicIdentifiers.NewOrderNumberAsync(_db, evening);
        Assert.Equal("Y071026-1", first);
        _db.Orders.Add(NewOrder(number: first));
        await _db.SaveChangesAsync();

        Assert.Equal("Y071026-2", await OrderPublicIdentifiers.NewOrderNumberAsync(_db, evening));
        // Another day starts again at 1.
        Assert.Equal("Y081026-1", await OrderPublicIdentifiers.NewOrderNumberAsync(_db, evening.AddDays(1)));
        Assert.True(await OrderPublicIdentifiers.IsNumberTakenAsync(_db, first));
        Assert.False(await OrderPublicIdentifiers.IsNumberTakenAsync(_db, "Y071026-9"));
    }

    [Fact]
    public async Task Backfill_NumbersExistingOrdersFromTheirOwnDate_ByIdWithinEachDay_AndKeepsTokensAndNumbersTheyHave()
    {
        var keep = NewOrder(number: "Y061026-1", token: "keep-" + OrderPublicIdentifiers.NewStatusToken());
        keep.OrderDate = new DateTime(2026, 10, 6, 9, 0, 0, DateTimeKind.Utc);
        var a = NewOrder(); a.OrderDate = new DateTime(2026, 10, 6, 10, 0, 0, DateTimeKind.Utc);
        var b = NewOrder(); b.OrderDate = new DateTime(2026, 10, 6, 11, 0, 0, DateTimeKind.Utc);
        var c = NewOrder(); c.OrderDate = new DateTime(2026, 10, 7, 9, 0, 0, DateTimeKind.Utc);
        _db.Orders.AddRange(keep, a, b, c);
        await _db.SaveChangesAsync();

        await OrderTrackingSchemaPatches.EnsureAsync(_db, NullLogger.Instance);

        var orders = await _db.Orders.AsNoTracking().ToListAsync();
        Assert.All(orders, o => Assert.False(string.IsNullOrEmpty(o.StatusToken)));
        Assert.Equal(orders.Count, orders.Select(o => o.OrderNumber).Distinct().Count());
        Assert.Equal("Y061026-1", orders.Single(o => o.Id == keep.Id).OrderNumber);
        Assert.Equal("Y061026-2", orders.Single(o => o.Id == a.Id).OrderNumber);
        Assert.Equal("Y061026-3", orders.Single(o => o.Id == b.Id).OrderNumber);
        Assert.Equal("Y071026-1", orders.Single(o => o.Id == c.Id).OrderNumber);
        Assert.Equal(keep.StatusToken, orders.Single(o => o.Id == keep.Id).StatusToken);
    }

    // ---- token lookup --------------------------------------------------------------------

    [Fact]
    public async Task Get_UnknownMalformedAndVoidedTokens_AreAllTheSameBare404()
    {
        var voided = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        voided.IsVoid = true;
        _db.Orders.Add(voided);
        await _db.SaveChangesAsync();

        foreach (var token in new[] { OrderPublicIdentifiers.NewStatusToken(), "nope", voided.StatusToken! })
        {
            var result = await _controller.Get(token);
            Assert.IsType<NotFoundResult>(result.Result);
        }
    }

    [Fact]
    public async Task Get_ReturnsTheOrderAsPlaced_WithoutPhoneOrLastName()
    {
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken(), number: "Y071026-3");
        order.GuestEmail = "anna@example.com";
        order.RecipientFirstName = "Анна";
        order.RecipientLastName = "Коваль";
        order.RecipientPhone = "+380670000000";
        order.DeliveryCityName = "Київ";
        order.DeliveryWarehouseName = "Відділення №12";
        order.TotalCents = 115000;
        order.OrderItems.Add(new OrderItem
        {
            ProductName = "Chérie",
            ProductCode = "YRN-1111",
            ColorName = "Pink",
            SizeName = "One Size",
            FurnitureColorName = "Gold",
            WithLace = true,
            Quantity = 1,
            UnitPrice = 1150m,
        });
        _db.Colors.Add(new Color { Name = "Pink", NameUk = "Рожевий" });
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var dto = Assert.IsType<OkObjectResult>((await _controller.Get(order.StatusToken!)).Result).Value as PublicOrderStatusDto;

        Assert.NotNull(dto);
        Assert.Equal("Y071026-3", dto.OrderNumber);
        Assert.Equal("Анна", dto.RecipientFirstName);
        Assert.Equal("Відділення №12", dto.DeliveryWarehouseName);
        Assert.Equal("anna@example.com", dto.Email);
        Assert.False(dto.IsAttachedToAccount);
        Assert.Equal(1150m, dto.Total / 1m);
        var item = Assert.Single(dto.Items);
        Assert.Equal("Pink", item.ColorName);
        Assert.Equal("Рожевий", item.ColorNameUk);
        Assert.Equal("Gold", item.FurnitureColorName);
        Assert.True(item.WithLace);

        var properties = typeof(PublicOrderStatusDto).GetProperties().Select(p => p.Name).ToList();
        Assert.DoesNotContain("RecipientPhone", properties);
        Assert.DoesNotContain("RecipientLastName", properties);
        Assert.DoesNotContain("CustomerPhoneNumber", properties);
    }

    [Fact]
    public async Task Get_FlagsAGuestOrderWhoseEmailAlreadyHasAnAccount()
    {
        _db.Customers.Add(NewCustomer("anna@example.com"));
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        order.GuestEmail = "Anna@Example.com";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var dto = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>((await _controller.Get(order.StatusToken!)).Result).Value!;

        Assert.True(dto.AccountExistsForEmail);
        Assert.False(dto.IsAttachedToAccount);
    }

    // ---- payment choice ------------------------------------------------------------------

    [Theory]
    [InlineData("Pending", true)]
    [InlineData("Accepted", true)]
    [InlineData("InProduction", true)]
    [InlineData("Made", true)]
    [InlineData("Shipped", false)]
    [InlineData("Received", false)]
    [InlineData("Canceled", false)]
    public async Task PaymentChoice_IsAllowedOnlyUntilShipped(string status, bool allowed)
    {
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        order.Status = status;
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var result = await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "transfer" });

        if (allowed)
            Assert.IsType<OkObjectResult>(result.Result);
        else
            Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Equal(allowed ? "Transfer" : null, (await _db.Orders.AsNoTracking().SingleAsync()).PaymentChoice);
    }

    [Fact]
    public async Task PaymentChoice_IsIdempotent_AndCanBeChanged()
    {
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        order.Status = "Accepted";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "transfer" });
        var firstAt = (await _db.Orders.AsNoTracking().SingleAsync()).PaymentChoiceAt;
        await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = " Transfer " });
        Assert.Equal(firstAt, (await _db.Orders.AsNoTracking().SingleAsync()).PaymentChoiceAt);

        await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "pickup" });
        var changed = await _db.Orders.AsNoTracking().SingleAsync();
        Assert.Equal("Pickup", changed.PaymentChoice);
        Assert.NotEqual(firstAt, changed.PaymentChoiceAt);
    }

    [Fact]
    public async Task PaymentChoice_RejectsUnknownChoicesAndTokens()
    {
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        Assert.IsType<BadRequestObjectResult>(
            (await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "cash" })).Result);
        Assert.IsType<NotFoundResult>(
            (await _controller.SetPaymentChoice(OrderPublicIdentifiers.NewStatusToken(), new SetPaymentChoiceRequest { Choice = "pickup" })).Result);
    }

    [Fact]
    public async Task TransferDetails_AppearOnlyForTransfer_WithTheOrderNumberInTheReference()
    {
        _settings.Json = """{"version":1,"recipient":"ФОП Коваль А.","cardNumber":"4441 1111 1111 1111","iban":"UA00 0000","reference":"Оплата {{order}}"}""";
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken(), number: "Y071026-3");
        order.Status = "Accepted";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var none = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>((await _controller.Get(order.StatusToken!)).Result).Value!;
        Assert.Null(none.TransferDetails);

        var transfer = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>(
            (await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "transfer" })).Result).Value!;
        Assert.Equal("ФОП Коваль А.", transfer.TransferDetails!.Recipient);
        Assert.Equal("4441 1111 1111 1111", transfer.TransferDetails.CardNumber);
        Assert.Equal("UA00 0000", transfer.TransferDetails.Iban);
        Assert.Equal("Оплата Y071026-3", transfer.TransferDetails.Reference);

        var pickup = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>(
            (await _controller.SetPaymentChoice(order.StatusToken!, new SetPaymentChoiceRequest { Choice = "pickup" })).Result).Value!;
        Assert.Null(pickup.TransferDetails);
    }

    [Fact]
    public void TransferDetails_AreNullByDefault_AndTheReferenceDefaultsToTheOrderNumber()
    {
        Assert.Null(OrderStatusController.ExtractTransferDetails(null, "Y1-1"));
        Assert.Null(OrderStatusController.ExtractTransferDetails("{}", "Y1-1"));
        Assert.Null(OrderStatusController.ExtractTransferDetails("not json", "Y1-1"));
        var details = OrderStatusController.ExtractTransferDetails("""{"recipient":"A","cardNumber":"1","reference":""}""", "Y1-1")!;
        Assert.Equal("Y1-1", details.Reference);
        Assert.Equal("", details.Iban);
    }

    // ---- guest order attachment -----------------------------------------------------------

    [Fact]
    public async Task StatusToken_WithMatchingEmail_AttachesAllGuestOrdersOfThatEmail()
    {
        var customer = NewCustomer("anna@example.com");
        _db.Customers.Add(customer);
        var opened = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        opened.GuestEmail = "ANNA@example.com";
        var other = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        other.GuestEmail = "anna@example.com";
        var someoneElse = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        someoneElse.GuestEmail = "bob@example.com";
        _db.Orders.AddRange(opened, other, someoneElse);
        await _db.SaveChangesAsync();

        var attached = await GuestOrderAttachment.AttachWithStatusTokenAsync(_db, customer, opened.StatusToken);

        Assert.Equal(2, attached);
        var orders = await _db.Orders.AsNoTracking().ToListAsync();
        Assert.Equal(customer.Id, orders.Single(o => o.Id == opened.Id).CustomerId);
        Assert.Equal(customer.Id, orders.Single(o => o.Id == other.Id).CustomerId);
        Assert.Null(orders.Single(o => o.Id == someoneElse.Id).CustomerId);
    }

    [Fact]
    public async Task StatusToken_WithADifferentEmail_OrNoToken_AttachesNothing()
    {
        var customer = NewCustomer("mallory@example.com");
        _db.Customers.Add(customer);
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        order.GuestEmail = "anna@example.com";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        Assert.Equal(0, await GuestOrderAttachment.AttachWithStatusTokenAsync(_db, customer, order.StatusToken));
        Assert.Equal(0, await GuestOrderAttachment.AttachWithStatusTokenAsync(_db, customer, null));
        Assert.Equal(0, await GuestOrderAttachment.AttachWithStatusTokenAsync(_db, customer, "nonsense"));
        Assert.Null((await _db.Orders.AsNoTracking().SingleAsync()).CustomerId);
    }

    [Fact]
    public async Task VerifiedEmail_AttachesGuestOrdersWithoutAToken()
    {
        var customer = NewCustomer("anna@example.com");
        _db.Customers.Add(customer);
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        order.GuestEmail = "anna@example.com";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        Assert.Equal(1, await GuestOrderAttachment.AttachAllByEmailAsync(_db, customer, "anna@example.com"));
        Assert.Equal(customer.Id, (await _db.Orders.AsNoTracking().SingleAsync()).CustomerId);

        // Attached orders are not touched again.
        Assert.Equal(0, await GuestOrderAttachment.AttachAllByEmailAsync(_db, customer, "anna@example.com"));
    }

    [Fact]
    public async Task AttachedOrder_ReportsItsAccount_AndItsAccountEmail()
    {
        var customer = NewCustomer("anna@example.com");
        _db.Customers.Add(customer);
        var order = NewOrder(token: OrderPublicIdentifiers.NewStatusToken());
        order.GuestEmail = "anna@example.com";
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        await GuestOrderAttachment.AttachAllByEmailAsync(_db, customer);

        var dto = (PublicOrderStatusDto)Assert.IsType<OkObjectResult>((await _controller.Get(order.StatusToken!)).Result).Value!;

        Assert.True(dto.IsAttachedToAccount);
        Assert.Equal("anna@example.com", dto.Email);
    }

    // ---- helpers ---------------------------------------------------------------------------

    private static Order NewOrder(string? number = null, string? token = null) => new()
    {
        Status = "Pending",
        OrderNumber = number,
        StatusToken = token,
        OrderDate = DateTime.UtcNow,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        CurrencyCode = "UAH",
    };

    private static Customer NewCustomer(string email) => new()
    {
        FirstName = "Anna",
        LastName = "K",
        UserName = email.Split('@')[0],
        Email = email,
        PasswordHash = "",
        PasswordSalt = "",
        IsActive = true,
    };

    private sealed class FakeSettings : IStorefrontSettingsService
    {
        public string? Json { get; set; }

        public bool IsAllowedKey(string key) => true;

        public Task<string?> GetValueJsonAsync(string key, CancellationToken ct = default) => Task.FromResult(Json);

        public Task<string> UpsertValueJsonAsync(string key, string valueJson, CancellationToken ct = default) => Task.FromResult(valueJson);
    }
}
