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
}
