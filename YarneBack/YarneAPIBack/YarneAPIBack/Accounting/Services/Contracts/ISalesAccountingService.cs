using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface ISalesAccountingService
{
    Task<IReadOnlyList<AccountingCustomerDto>> GetCustomersAsync(CancellationToken ct = default);
    Task<AccountingCustomerDto> CreateCustomerAsync(
        SaveAccountingCustomerRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<AccountingCustomerDto?> UpdateCustomerAsync(
        int id,
        SaveAccountingCustomerRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidCustomerAsync(int id, int? actorId, CancellationToken ct = default);
    Task<IReadOnlyList<SalesChannelDto>> GetChannelsAsync(CancellationToken ct = default);
    Task<SalesChannelDto> CreateChannelAsync(
        SaveSalesChannelRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<SalesChannelDto?> UpdateChannelAsync(
        int id,
        SaveSalesChannelRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidChannelAsync(int id, int? actorId, CancellationToken ct = default);

    Task<IReadOnlyList<AccountingSalesOrderDto>> GetSalesOrdersAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default);
    Task<AccountingSalesOrderDto?> GetSalesOrderAsync(int id, CancellationToken ct = default);
    Task<AccountingSalesOrderDto> CreateSalesOrderAsync(
        CreateAccountingSalesOrderRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidSalesOrderAsync(int id, int? actorId, CancellationToken ct = default);

    /// <summary>
    /// Retroactively runs FIFO COGS consumption on an already-existing website <c>Order</c>'s
    /// items and assigns it to the "Онлайн магазин" channel, so it starts showing correctly in
    /// the Accounting Sales list. Does not create a new order or touch stock counters (those were
    /// already decremented at checkout) — idempotent, safe to call more than once.
    /// </summary>
    Task ComposeReceivedOrderAsync(int orderId, int? actorId, CancellationToken ct = default);
}
