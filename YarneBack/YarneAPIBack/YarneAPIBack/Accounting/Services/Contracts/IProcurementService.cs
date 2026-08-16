using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IProcurementService
{
    Task<IReadOnlyList<CurrencyDto>> GetCurrenciesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ExchangeRateDto>> GetExchangeRatesAsync(CancellationToken ct = default);
    Task<ExchangeRateDto> SetExchangeRateAsync(
        SetExchangeRateRequest request,
        int? actorId,
        CancellationToken ct = default);

    Task<IReadOnlyList<SupplierDto>> GetSuppliersAsync(CancellationToken ct = default);
    Task<SupplierDto?> GetSupplierAsync(int id, CancellationToken ct = default);
    Task<SupplierDto> CreateSupplierAsync(
        SaveSupplierRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<SupplierDto?> UpdateSupplierAsync(
        int id,
        SaveSupplierRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidSupplierAsync(int id, int? actorId, CancellationToken ct = default);

    Task<IReadOnlyList<PurchaseOrderDto>> GetPurchaseOrdersAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default);
    Task<PurchaseOrderDto?> GetPurchaseOrderAsync(int id, CancellationToken ct = default);
    Task<PurchaseOrderDto> CreatePurchaseOrderAsync(
        SavePurchaseOrderRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<PurchaseOrderDto?> UpdatePurchaseOrderAsync(
        int id,
        SavePurchaseOrderRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidPurchaseOrderAsync(int id, int? actorId, CancellationToken ct = default);
}
