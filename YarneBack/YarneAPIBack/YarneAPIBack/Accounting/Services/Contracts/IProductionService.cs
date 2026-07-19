using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IProductionService
{
    Task<IReadOnlyList<ProductionOrderDto>> GetProductionOrdersAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default);
    Task<ProductionOrderDto?> GetProductionOrderAsync(int id, CancellationToken ct = default);
    Task<ProductionOrderDto> CompleteProductionAsync(
        CreateProductionOrderRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidProductionOrderAsync(int id, int? actorId, CancellationToken ct = default);
    Task<IReadOnlyList<FinishedGoodsStockProductDto>> GetFinishedGoodsStockAsync(
        CancellationToken ct = default);
    Task<IReadOnlyList<VariantProducedAvailabilityDto>> GetVariantProducedAvailabilityAsync(
        int productId,
        CancellationToken ct = default);
    Task<ApplyVariantStockResultDto> ApplyVariantStockAsync(
        ApplyVariantStockRequest request,
        int? actorId,
        CancellationToken ct = default);
}
