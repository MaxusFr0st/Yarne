using YarneAPIBack.DTOs.Product;

namespace YarneAPIBack.Services.Contracts;

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> GetProductsAsync(string? category = null, bool? isNew = null, bool includeInactive = false, CancellationToken ct = default);

    Task<ProductDetailDto?> GetProductByIdAsync(int id, CancellationToken ct = default);

    Task<ProductDetailDto?> GetProductByCodeAsync(string productCode, CancellationToken ct = default);

    Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken ct = default);

    Task<ProductDto?> UpdateProductAsync(int id, UpdateProductRequest request, CancellationToken ct = default);

    Task<bool> DeleteProductAsync(int id, CancellationToken ct = default);
}
