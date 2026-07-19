using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IProductAccountingService
{
    Task<IReadOnlyList<AccountingProductDto>> GetProductsAsync(CancellationToken ct = default);
    Task<AccountingProductDto?> GetProductAsync(int id, CancellationToken ct = default);
    Task<AccountingProductDto?> UpdateProductAccountingAsync(
        int id,
        UpdateProductAccountingRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<AccountingProductDto?> SaveBomAsync(
        int productId,
        SaveProductBomRequest request,
        int? actorId,
        CancellationToken ct = default);
}
