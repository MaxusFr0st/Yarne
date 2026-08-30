using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Controllers;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Admin;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Tests;

/// <summary>
/// Covers the offline-order idempotency guarantee from wowFactor.md's Step 5: a queued order
/// synced twice (flaky reconnect, two tabs) must produce exactly one Order row, not two.
/// </summary>
public class OrdersControllerIdempotencyTests : IDisposable
{
    private readonly YarneDbContext _db;
    private readonly OrdersController _controller;

    public OrdersControllerIdempotencyTests()
    {
        var options = new DbContextOptionsBuilder<YarneDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new YarneDbContext(options);

        var category = new Category { Name = "Bags" };
        _db.Categories.Add(category);
        _db.Products.Add(new Product
        {
            ProductCode = "YRN-P000001",
            Name = "Femmora",
            Price = 1500m,
            SellingCurrencyCode = "UAH",
            Category = category,
            IsActive = true,
        });
        _db.PaymentMethods.Add(new PaymentMethod { Name = "Cash on delivery" });
        _db.SaveChanges();

        _controller = new OrdersController(
            _db,
            new NoopAdminActivityLogService(),
            new NoopEmailService(),
            new NoopNovaPoshtaService(),
            new ConfigurationBuilder().Build(),
            NullLogger<OrdersController>.Instance,
            new NoopSalesAccountingService());
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
        };
    }

    public void Dispose() => _db.Dispose();

    private static CreateOrderRequest BuildRequest(Guid clientOrderId) => new()
    {
        ClientOrderId = clientOrderId,
        Items = [new CreateOrderItemRequest { ProductIdOrCode = "YRN-P000001", Quantity = 1 }],
        PhoneNumber = "+380501234567",
        Email = "guest@example.com",
        RecipientFirstName = "Guest",
        RecipientLastName = "Buyer",
        RecipientPhone = "+380501234567",
        DeliveryCityRef = "city-ref-1",
        DeliveryCityName = "Kyiv",
        DeliveryWarehouseRef = "warehouse-ref-1",
        DeliveryWarehouseName = "Branch #1",
    };

    [Fact]
    public async Task CreateOrder_SyncedTwiceWithSameClientOrderId_CreatesExactlyOneOrder()
    {
        var clientOrderId = Guid.NewGuid();

        var firstResult = await _controller.CreateOrder(BuildRequest(clientOrderId), CancellationToken.None);
        var secondResult = await _controller.CreateOrder(BuildRequest(clientOrderId), CancellationToken.None);

        var firstOrder = Assert.IsType<OrderDto>(Assert.IsType<ObjectResult>(firstResult.Result).Value);
        var secondOrder = Assert.IsType<OrderDto>(Assert.IsType<ObjectResult>(secondResult.Result).Value);

        Assert.Equal(firstOrder.Id, secondOrder.Id);
        Assert.Equal(1, await _db.Orders.CountAsync());
    }

    [Fact]
    public async Task CreateOrder_WithDifferentClientOrderIds_CreatesTwoOrders()
    {
        await _controller.CreateOrder(BuildRequest(Guid.NewGuid()), CancellationToken.None);
        await _controller.CreateOrder(BuildRequest(Guid.NewGuid()), CancellationToken.None);

        Assert.Equal(2, await _db.Orders.CountAsync());
    }

    private sealed class NoopAdminActivityLogService : IAdminActivityLogService
    {
        public Task LogAsync(string category, string action, string summary, string? entityId = null, string? entityLabel = null, object? details = null, int? actorUserId = null, string? actorEmail = null, CancellationToken ct = default) => Task.CompletedTask;
        public Task<IReadOnlyList<AdminActivityLogDto>> GetLogsAsync(string? category = null, int limit = 100, int offset = 0, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<AdminActivityLogDto>>([]);
    }

    private sealed class NoopEmailService : IEmailService
    {
        public Task SendOrderConfirmationAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
        public Task SendOrderReceiptAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class NoopNovaPoshtaService : INovaPoshtaService
    {
        public bool IsConfigured => false;
        public IReadOnlyList<NovaPoshtaSenderProfile> SenderProfiles => [];
        public NovaPoshtaSenderProfile? DefaultSenderProfile => null;
        public Task<NovaPoshtaWaybill> CreateWaybillAsync(string senderProfileId, NovaPoshtaSenderAddress? senderAddressOverride, string recipientFirstName, string recipientLastName, string recipientPhone, string cityRef, string warehouseRef, decimal declaredCost, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<NovaPoshtaTrackingStatus?> GetTrackingStatusAsync(string ttnNumber, CancellationToken ct = default) => Task.FromResult<NovaPoshtaTrackingStatus?>(null);
        public Task<decimal?> GetShippingPriceAsync(string recipientCityRef, decimal declaredCost, CancellationToken ct = default) => Task.FromResult<decimal?>(null);
        public Task<IReadOnlyList<NovaPoshtaCity>> GetCitiesAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<NovaPoshtaCity>>([]);
        public Task<IReadOnlyList<NovaPoshtaWarehouse>> GetWarehousesAsync(string cityRef, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<NovaPoshtaWarehouse>>([]);
        public Task<bool> DeleteWaybillAsync(string senderProfileId, string ttnRef, CancellationToken ct = default) => Task.FromResult(false);
    }

    private sealed class NoopSalesAccountingService : ISalesAccountingService
    {
        public Task<IReadOnlyList<AccountingCustomerDto>> GetCustomersAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task<AccountingCustomerDto> CreateCustomerAsync(SaveAccountingCustomerRequest request, int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<AccountingCustomerDto?> UpdateCustomerAsync(int id, SaveAccountingCustomerRequest request, int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<bool> VoidCustomerAsync(int id, int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<IReadOnlyList<SalesChannelDto>> GetChannelsAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task<SalesChannelDto> CreateChannelAsync(SaveSalesChannelRequest request, int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<SalesChannelDto?> UpdateChannelAsync(int id, SaveSalesChannelRequest request, int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<bool> VoidChannelAsync(int id, int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<IReadOnlyList<AccountingSalesOrderDto>> GetSalesOrdersAsync(DateTime? from, DateTime? to, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<AccountingSalesOrderDto?> GetSalesOrderAsync(int id, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<AccountingSalesOrderDto> CreateSalesOrderAsync(CreateAccountingSalesOrderRequest request, int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<bool> VoidSalesOrderAsync(int id, int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task ComposeReceivedOrderAsync(int orderId, int? actorId, CancellationToken ct = default) => Task.CompletedTask;
        public Task<IReadOnlyList<FinishedGoodsFifoConsumption>> ConsumeFinishedGoodsFifoAsync(int productId, int quantity, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<int> ReconcileFinishedGoodsAsync(int? actorId, CancellationToken ct = default) => throw new NotSupportedException();
    }
}
