using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Product;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class ProductService : IProductService
{
    private const int MaxSuggestedProductCount = 10;

    private readonly YarneDbContext _context;
    private readonly IUploadFileStorageService _uploadStorage;

    public ProductService(YarneDbContext context, IUploadFileStorageService uploadStorage)
    {
        _context = context;
        _uploadStorage = uploadStorage;
    }

    public async Task<IReadOnlyList<ProductDto>> GetProductsAsync(string? category = null, bool? isNew = null, int? collectionId = null, bool includeInactive = false, CancellationToken ct = default)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
            .Include(p => p.DefaultColor)
            .Include(p => p.DefaultFurnitureColor)
            .Include(p => p.ProductFurnitureColors)
                .ThenInclude(pfc => pfc.FurnitureColor)
            .Include(p => p.ProductSizes)
                .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Color)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
                    .ThenInclude(si => si.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.VariantStocks)
                    .ThenInclude(vs => vs.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .AsQueryable();

        if (!includeInactive)
            query = query.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category.Name == category);

        if (isNew == true)
            query = query.Where(p => p.IsNew);

        if (collectionId.HasValue)
            query = query.Where(p => p.CollectionId == collectionId.Value);

        var products = await query.AsNoTracking().OrderBy(p => p.Name).ToListAsync(ct);

        return products.Select(MapToProductDto).ToList();
    }

    public async Task<ProductDetailDto?> GetProductByIdAsync(int id, bool activeOnly = false, CancellationToken ct = default)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
            .Include(p => p.DefaultColor)
            .Include(p => p.DefaultFurnitureColor)
            .Include(p => p.ProductFurnitureColors)
                .ThenInclude(pfc => pfc.FurnitureColor)
            .Include(p => p.ProductSizes)
                .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Color)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
                    .ThenInclude(si => si.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.VariantStocks)
                    .ThenInclude(vs => vs.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .Include(p => p.Recommendations)
                .ThenInclude(r => r.RelatedProduct)
                    .ThenInclude(rp => rp.Category)
            .Include(p => p.Recommendations)
                .ThenInclude(r => r.RelatedProduct)
                    .ThenInclude(rp => rp.ProductImages)
            .FirstOrDefaultAsync(p => p.Id == id && (!activeOnly || p.IsActive), ct);

        return product == null ? null : MapToProductDetailDto(product, activeSuggestionsOnly: activeOnly);
    }

    public async Task<ProductDetailDto?> GetProductByCodeAsync(string productCode, CancellationToken ct = default)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
            .Include(p => p.DefaultColor)
            .Include(p => p.DefaultFurnitureColor)
            .Include(p => p.ProductFurnitureColors)
                .ThenInclude(pfc => pfc.FurnitureColor)
            .Include(p => p.ProductSizes)
                .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Color)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
                    .ThenInclude(si => si.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.VariantStocks)
                    .ThenInclude(vs => vs.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .Include(p => p.Recommendations)
                .ThenInclude(r => r.RelatedProduct)
                    .ThenInclude(rp => rp.Category)
            .Include(p => p.Recommendations)
                .ThenInclude(r => r.RelatedProduct)
                    .ThenInclude(rp => rp.ProductImages)
            .FirstOrDefaultAsync(p => p.ProductCode == productCode && p.IsActive, ct);

        return product == null ? null : MapToProductDetailDto(product, activeSuggestionsOnly: true);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken ct = default)
    {
        EnsureNonNegativePrice(request.Price);
        EnsureNonNegativeStockInputs(request.QuantityInStock, request.VariantStocks);

        var validSizeIds = await ResolveSizeIdsAsync(request.SizeIds, request.DefaultSizeId, request.ColorSizeVariants.Select(v => v.SizeId), ct);
        var defaultSizeId = await ResolveDefaultSizeIdAsync(validSizeIds, request.DefaultSizeId, ct);
        var computedTotalStock = ComputeTotalStock(request.QuantityInStock, request.VariantStocks);

        var productCode = await ResolveCreateProductCodeAsync(request.ProductCode, ct);

        var product = new Models.Product
        {
            ProductCode = productCode,
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            QuantityInStock = computedTotalStock,
            Material = request.Material,
            CategoryId = request.CategoryId,
            CollectionId = request.CollectionId,
            ProducerName = request.ProducerName,
            DefaultSizeId = defaultSizeId,
            IsActive = true,
            IsNew = request.IsNew,
            IsBestseller = request.IsBestseller,
            Lace = request.Lace,
        };
        _context.Products.Add(product);
        await _context.SaveChangesAsync(ct);

        await ReplaceProductImagesAsync(product.Id, request.ImageUrls, ct);
        await ReplaceProductSizesAsync(product.Id, validSizeIds, ct);

        var colorIds = ResolveColorIds(request.ColorIds, request.ColorVariants, request.ColorSizeVariants);
        var defaultColorId = ResolveDefaultColorId(colorIds, request.DefaultColorId);
        await ReplaceProductColorsAsync(product.Id, OrderColorIdsWithDefault(colorIds, defaultColorId), ct);
        product.DefaultColorId = defaultColorId;

        var furnitureColorIds = (request.FurnitureColorIds ?? new List<int>()).Where(id => id > 0).Distinct().ToList();
        var defaultFurnitureColorId = ResolveDefaultColorId(furnitureColorIds, request.DefaultFurnitureColorId);
        await ReplaceProductFurnitureColorsAsync(product.Id, OrderColorIdsWithDefault(furnitureColorIds, defaultFurnitureColorId), ct);
        product.DefaultFurnitureColorId = defaultFurnitureColorId;

        var fallbackImages = NormalizeUrls(request.ImageUrls);
        var colorSizeVariants = BuildColorSizeVariantsForWrite(
            request.ColorSizeVariants,
            request.ColorVariants,
            colorIds,
            defaultSizeId,
            fallbackImages
        );
        await ReplaceColorSizeImagesAsync(product.Id, colorSizeVariants, ct);
        await ReplaceVariantStocksAsync(product.Id, request.VariantStocks, ct);
        await ReplaceProductRecommendationsAsync(product.Id, product.ProductCode, request.SuggestedProductCodes, ct);

        await _context.SaveChangesAsync(ct);

        var created = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
            .Include(p => p.DefaultColor)
            .Include(p => p.DefaultFurnitureColor)
            .Include(p => p.ProductFurnitureColors)
                .ThenInclude(pfc => pfc.FurnitureColor)
            .Include(p => p.ProductSizes)
                .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Color)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
                    .ThenInclude(si => si.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.VariantStocks)
                    .ThenInclude(vs => vs.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .FirstAsync(p => p.Id == product.Id, ct);
        return MapToProductDto(created);
    }

    private async Task<string> ResolveCreateProductCodeAsync(string? requestedCode, CancellationToken ct)
    {
        var normalizedRequested = requestedCode?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedRequested))
        {
            var exists = await _context.Products.AnyAsync(p => p.ProductCode == normalizedRequested, ct);
            if (exists)
                throw new InvalidOperationException($"Product code '{normalizedRequested}' already exists.");
            return normalizedRequested;
        }

        return await GenerateUniqueProductCodeAsync(ct);
    }

    private async Task<string> GenerateUniqueProductCodeAsync(CancellationToken ct)
    {
        const string Prefix = "YRN-";
        const int MaxAttempts = 25;

        for (var attempt = 0; attempt < MaxAttempts; attempt++)
        {
            var n = RandomNumberGenerator.GetInt32(0, 1_000_000);
            var code = $"{Prefix}{n:000000}";

            var exists = await _context.Products.AnyAsync(p => p.ProductCode == code, ct);
            if (!exists)
                return code;
        }

        // Extremely unlikely (1e6 space + unique index as final guard), but don't spin forever.
        throw new InvalidOperationException("Unable to generate unique product code. Please try again.");
    }

    public async Task<ProductDto?> UpdateProductAsync(int id, UpdateProductRequest request, CancellationToken ct = default)
    {
        EnsureNonNegativePrice(request.Price);
        EnsureNonNegativeStockInputs(request.QuantityInStock, request.VariantStocks);

        var product = await _context.Products
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.VariantStocks)
            .Include(p => p.ProductFurnitureColors)
            .Include(p => p.ProductSizes)
            .Include(p => p.DefaultSize)
            .Include(p => p.DefaultColor)
            .Include(p => p.DefaultFurnitureColor)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product == null) return null;

        var previousUploadUrls = CollectProductUploadUrls(product);

        product.ProductCode = request.ProductCode;
        product.Name = request.Name;
        product.Description = request.Description;
        product.Price = request.Price;
        product.QuantityInStock = ComputeTotalStock(request.QuantityInStock, request.VariantStocks);
        product.Material = request.Material;
        product.CategoryId = request.CategoryId;
        product.CollectionId = request.CollectionId ?? product.CollectionId;
        product.ProducerName = request.ProducerName;
        product.IsActive = request.IsActive;
        if (request.IsNew.HasValue)
            product.IsNew = request.IsNew.Value;
        if (request.IsBestseller.HasValue)
            product.IsBestseller = request.IsBestseller.Value;
        product.Lace = request.Lace;

        if (request.ImageUrls is not null)
            await ReplaceProductImagesAsync(product.Id, request.ImageUrls, ct);

        if (request.SizeIds is not null || request.ColorSizeVariants is not null || request.DefaultSizeId is not null)
        {
            var requestedSizeIds = request.SizeIds ?? product.ProductSizes.Select(ps => ps.SizeId).ToList();
            var validSizeIds = await ResolveSizeIdsAsync(
                requestedSizeIds,
                request.DefaultSizeId ?? product.DefaultSizeId,
                (request.ColorSizeVariants ?? new List<ColorSizeVariantInput>()).Select(v => v.SizeId),
                ct
            );
            await ReplaceProductSizesAsync(product.Id, validSizeIds, ct);
            product.DefaultSizeId = await ResolveDefaultSizeIdAsync(validSizeIds, request.DefaultSizeId ?? product.DefaultSizeId, ct);
        }
        else
        {
            product.DefaultSizeId = request.DefaultSizeId ?? product.DefaultSizeId;
        }

        var shouldUpdateColors = request.ColorIds is not null || request.ColorVariants is not null || request.ColorSizeVariants is not null;
        if (shouldUpdateColors || request.DefaultColorId is not null)
        {
            var colorIds = shouldUpdateColors
                ? ResolveColorIds(request.ColorIds, request.ColorVariants, request.ColorSizeVariants)
                : product.ProductColors.OrderBy(pc => pc.SortOrder).Select(pc => pc.ColorId).ToList();
            var defaultColorId = ResolveDefaultColorId(colorIds, request.DefaultColorId ?? product.DefaultColorId);
            product.DefaultColorId = defaultColorId;
            await ReplaceProductColorsAsync(product.Id, OrderColorIdsWithDefault(colorIds, defaultColorId), ct);
        }

        if (request.FurnitureColorIds is not null || request.DefaultFurnitureColorId is not null)
        {
            var furnitureColorIds = request.FurnitureColorIds is not null
                ? request.FurnitureColorIds.Where(id => id > 0).Distinct().ToList()
                : product.ProductFurnitureColors.OrderBy(pc => pc.SortOrder).Select(pc => pc.FurnitureColorId).ToList();
            var defaultFurnitureColorId = ResolveDefaultColorId(furnitureColorIds, request.DefaultFurnitureColorId ?? product.DefaultFurnitureColorId);
            product.DefaultFurnitureColorId = defaultFurnitureColorId;
            await ReplaceProductFurnitureColorsAsync(product.Id, OrderColorIdsWithDefault(furnitureColorIds, defaultFurnitureColorId), ct);
        }

        var shouldUpdateColorSizeImages = request.ColorSizeVariants is not null || request.ColorVariants is not null || request.ColorIds is not null;
        if (shouldUpdateColorSizeImages)
        {
            var fallbackImages = request.ImageUrls is not null
                ? NormalizeUrls(request.ImageUrls)
                : product.ProductImages.OrderBy(pi => pi.SortOrder).Select(pi => pi.ImageUrl).ToList();
            var colorIdsForFallback = request.ColorIds ?? product.ProductColors.Select(pc => pc.ColorId).ToList();
            var defaultSizeId = product.DefaultSizeId;
            var colorSizeVariants = BuildColorSizeVariantsForWrite(
                request.ColorSizeVariants,
                request.ColorVariants,
                colorIdsForFallback,
                defaultSizeId,
                fallbackImages
            );
            await ReplaceColorSizeImagesAsync(product.Id, colorSizeVariants, ct);
        }

        if (request.VariantStocks is not null)
            await ReplaceVariantStocksAsync(product.Id, request.VariantStocks, ct);

        if (request.SuggestedProductCodes is not null)
            await ReplaceProductRecommendationsAsync(product.Id, product.ProductCode, request.SuggestedProductCodes, ct);

        await _context.SaveChangesAsync(ct);

        var updated = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
            .Include(p => p.DefaultColor)
            .Include(p => p.DefaultFurnitureColor)
            .Include(p => p.ProductFurnitureColors)
                .ThenInclude(pfc => pfc.FurnitureColor)
            .Include(p => p.ProductSizes)
                .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Color)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
                    .ThenInclude(si => si.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.VariantStocks)
                    .ThenInclude(vs => vs.ProductSize)
                        .ThenInclude(ps => ps.Size)
            .FirstAsync(p => p.Id == id, ct);

        await _uploadStorage.DeleteRemovedIfUnreferencedAsync(
            previousUploadUrls,
            CollectProductUploadUrls(updated),
            ct);

        return MapToProductDto(updated);
    }

    private static void EnsureNonNegativeStockInputs(int explicitStock, IEnumerable<VariantStockInput>? variantStocks)
    {
        if (explicitStock < 0)
            throw new InvalidOperationException("Stock cannot be negative.");

        if (variantStocks == null) return;
        if (variantStocks.Any(v => v.QuantityInStock < 0))
            throw new InvalidOperationException("Variant stock cannot be negative.");
    }

    private static void EnsureNonNegativePrice(decimal price)
    {
        if (price < 0)
            throw new InvalidOperationException("Price cannot be negative.");
    }

    public async Task<bool> DeleteProductAsync(int id, CancellationToken ct = default)
    {
        var product = await _context.Products
            .Include(p => p.Countries)
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product == null) return false;

        var previousUploadUrls = CollectProductUploadUrls(product);

        var orderItems = await _context.OrderItems
            .Include(oi => oi.Product)
                .ThenInclude(p => p!.ProductImages)
            .Include(oi => oi.Product)
                .ThenInclude(p => p!.ProductColors)
                    .ThenInclude(pc => pc.Images)
            .Include(oi => oi.Product)
                .ThenInclude(p => p!.ProductColors)
                    .ThenInclude(pc => pc.SizeImages)
            .Where(oi => oi.ProductId == id)
            .ToListAsync(ct);

        foreach (var orderItem in orderItems)
        {
            if (orderItem.Product != null)
                OrderItemSnapshotHelper.ApplyProductSnapshot(orderItem, orderItem.Product);
        }

        // Be defensive here: some deployed databases still have NO ACTION on
        // composite product variant FKs, so explicit cleanup avoids delete
        // failures for newly created products with variant/image records.
        var colorSizeImages = await _context.ProductColorSizeImages
            .Where(v => v.ProductId == id)
            .ToListAsync(ct);
        _context.ProductColorSizeImages.RemoveRange(colorSizeImages);

        var variantStocks = await _context.ProductVariantStocks
            .Where(v => v.ProductId == id)
            .ToListAsync(ct);
        _context.ProductVariantStocks.RemoveRange(variantStocks);

        var colorImages = await _context.ProductColorImages
            .Where(v => v.ProductId == id)
            .ToListAsync(ct);
        _context.ProductColorImages.RemoveRange(colorImages);

        var productImages = await _context.ProductImages
            .Where(v => v.ProductId == id)
            .ToListAsync(ct);
        _context.ProductImages.RemoveRange(productImages);

        var productColors = await _context.ProductColors
            .Where(v => v.ProductId == id)
            .ToListAsync(ct);
        _context.ProductColors.RemoveRange(productColors);

        var productSizes = await _context.ProductSizes
            .Where(v => v.ProductId == id)
            .ToListAsync(ct);
        _context.ProductSizes.RemoveRange(productSizes);

        product.Countries.Clear();
        _context.Products.Remove(product);
        await _context.SaveChangesAsync(ct);

        await _uploadStorage.DeleteRemovedIfUnreferencedAsync(previousUploadUrls, Array.Empty<string>(), ct);
        return true;
    }

    private static IEnumerable<string?> CollectProductUploadUrls(Models.Product product)
    {
        yield return product.ImageUrl;

        foreach (var image in product.ProductImages)
            yield return image.ImageUrl;

        foreach (var color in product.ProductColors)
        {
            foreach (var image in color.Images)
                yield return image.ImageUrl;

            foreach (var sizeImage in color.SizeImages)
                yield return sizeImage.ImageUrl;
        }
    }

    private static ProductDto MapToProductDto(Models.Product p)
    {
        var images = GetOrderedImageUrls(p);
        var sizes = p.ProductSizes
            .OrderBy(ps => ps.SortOrder)
            .Select(ps => new SizeOptionDto
            {
                Name = ps.Size.Name,
                NameUk = ps.Size.NameUk,
            })
            .ToList();
        var defaultSize = p.DefaultSize?.Name ?? sizes.FirstOrDefault()?.Name;

        var colors = p.ProductColors.Count > 0
            ? p.ProductColors.OrderBy(pc => pc.SortOrder).Select((pc, i) =>
            {
                var sizeImages = pc.SizeImages
                    .Where(si => !si.Lace)
                    .GroupBy(si => si.ProductSize.Size.Name)
                    .ToDictionary(
                        g => g.Key,
                        g => MediaUrlNormalizer.NormalizeList(
                            g.OrderBy(si => si.SortOrder).Select(si => si.ImageUrl))
                    );
                var sizeStocks = pc.VariantStocks
                    .Where(vs => !vs.Lace)
                    .GroupBy(vs => vs.ProductSize.Size.Name)
                    .ToDictionary(g => g.Key, g => g.Sum(v => v.QuantityInStock));

                var sizeNames = pc.SizeImages.Select(si => si.ProductSize.Size.Name)
                    .Concat(pc.VariantStocks.Select(vs => vs.ProductSize.Size.Name))
                    .Distinct()
                    .ToList();
                var laceVariants = sizeNames.ToDictionary(
                    sizeName => sizeName,
                    sizeName => new LaceSizeVariantDto
                    {
                        WithLaceImages = MediaUrlNormalizer.NormalizeList(
                            pc.SizeImages
                                .Where(si => si.ProductSize.Size.Name == sizeName && si.Lace)
                                .OrderBy(si => si.SortOrder)
                                .Select(si => si.ImageUrl)),
                        WithoutLaceImages = MediaUrlNormalizer.NormalizeList(
                            pc.SizeImages
                                .Where(si => si.ProductSize.Size.Name == sizeName && !si.Lace)
                                .OrderBy(si => si.SortOrder)
                                .Select(si => si.ImageUrl)),
                        WithLaceStock = pc.VariantStocks
                            .Where(vs => vs.ProductSize.Size.Name == sizeName && vs.Lace)
                            .Sum(v => v.QuantityInStock),
                        WithoutLaceStock = pc.VariantStocks
                            .Where(vs => vs.ProductSize.Size.Name == sizeName && !vs.Lace)
                            .Sum(v => v.QuantityInStock),
                    });

                var defaultSizeImages = (!string.IsNullOrWhiteSpace(defaultSize) && sizeImages.TryGetValue(defaultSize, out var imgsForDefault))
                    ? imgsForDefault
                    : sizeImages.Values.FirstOrDefault() ?? new List<string>();

                var colorImages = defaultSizeImages.Count > 0
                    ? defaultSizeImages
                    : MediaUrlNormalizer.NormalizeList(
                        pc.Images.OrderBy(pi => pi.SortOrder).Select(pi => pi.ImageUrl));

                var fallback = NormalizeUrl(
                    images.Count > i ? images[i] : images.FirstOrDefault() ?? p.ImageUrl) ?? "";
                return new ColorVariantDto
                {
                    Name = pc.Color.Name,
                    NameUk = pc.Color.NameUk,
                    Hex = pc.Color.HexCode,
                    ImageUrl = colorImages.Count > 0 ? colorImages[0] : fallback,
                    ImageUrls = colorImages.Count > 0 ? colorImages : new List<string> { fallback },
                    SizeImages = sizeImages,
                    SizeStocks = sizeStocks,
                    LaceVariants = laceVariants,
                };
            }).ToList()
            : images.Select((url, i) => new ColorVariantDto
            {
                Name = $"Variant {i + 1}",
                Hex = "#2D241E",
                ImageUrl = url,
                ImageUrls = new List<string> { url },
            }).ToList();
        if (colors.Count == 0)
        {
            var legacy = NormalizeUrl(p.ImageUrl);
            if (!string.IsNullOrEmpty(legacy))
                colors.Add(new ColorVariantDto { Name = "Default", Hex = "#2D241E", ImageUrl = legacy, ImageUrls = new List<string> { legacy } });
        }

        var furnitureColors = p.ProductFurnitureColors
            .OrderBy(pc => pc.SortOrder)
            .Select(pc => new FurnitureColorVariantDto
            {
                Name = pc.FurnitureColor.Name,
                NameUk = pc.FurnitureColor.NameUk,
                Hex = pc.FurnitureColor.HexCode,
            })
            .ToList();

        return new ProductDto
        {
            Id = p.Id,
            ProductCode = p.ProductCode,
            Name = p.Name,
            Description = p.Description,
            Price = p.Price,
            QuantityInStock = p.QuantityInStock,
            Material = p.Material,
            PrimaryImageUrl = images.FirstOrDefault() ?? p.ImageUrl,
            ImageUrls = images,
            Colors = colors,
            FurnitureColors = furnitureColors,
            Sizes = sizes,
            DefaultSize = defaultSize,
            DefaultColor = p.DefaultColor?.Name ?? colors.FirstOrDefault()?.Name,
            DefaultFurnitureColor = p.DefaultFurnitureColor?.Name ?? furnitureColors.FirstOrDefault()?.Name,
            CategoryName = p.Category.Name,
            CollectionName = p.Collection?.Name,
            ProducerName = p.ProducerName,
            IsActive = p.IsActive,
            IsNew = p.IsNew,
            IsBestseller = p.IsBestseller,
            Lace = p.Lace,
            CreatedAt = p.CreatedAt,
        };
    }

    private static ProductDetailDto MapToProductDetailDto(Models.Product p, bool activeSuggestionsOnly)
    {
        var baseDto = MapToProductDto(p);
        var recommendations = (p.Recommendations ?? new List<Models.ProductRecommendation>())
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.RelatedProductId)
            .ToList();

        var suggestedCodes = recommendations
            .Select(r => r.RelatedProduct.ProductCode)
            .ToList();

        var suggestedProducts = recommendations
            .Select(r => r.RelatedProduct)
            .Where(rp => !activeSuggestionsOnly || rp.IsActive)
            .Select(MapToSuggestedProductDto)
            .ToList();

        return new ProductDetailDto
        {
            Id = baseDto.Id,
            ProductCode = baseDto.ProductCode,
            Name = baseDto.Name,
            Description = baseDto.Description,
            Price = baseDto.Price,
            QuantityInStock = baseDto.QuantityInStock,
            Material = baseDto.Material,
            PrimaryImageUrl = baseDto.PrimaryImageUrl,
            ImageUrls = baseDto.ImageUrls,
            CategoryName = baseDto.CategoryName,
            CollectionName = baseDto.CollectionName,
            ProducerName = baseDto.ProducerName,
            IsActive = baseDto.IsActive,
            CreatedAt = baseDto.CreatedAt,
            Sizes = baseDto.Sizes,
            DefaultSize = baseDto.DefaultSize,
            DefaultColor = baseDto.DefaultColor,
            Subtitle = p.Material,
            IsNew = p.IsNew,
            IsBestseller = p.IsBestseller,
            Lace = p.Lace,
            Details = BuildDetailsList(p),
            Colors = baseDto.Colors,
            SuggestedProductCodes = suggestedCodes,
            HasConfiguredSuggestions = p.SuggestionsConfigured,
            SuggestedProducts = suggestedProducts,
        };
    }

    private static SuggestedProductDto MapToSuggestedProductDto(Models.Product p)
    {
        var images = GetOrderedImageUrls(p);
        return new SuggestedProductDto
        {
            ProductCode = p.ProductCode,
            Name = p.Name,
            Price = p.Price,
            PrimaryImageUrl = images.FirstOrDefault() ?? p.ImageUrl,
            CategoryName = p.Category?.Name ?? string.Empty,
            IsNew = p.IsNew,
            IsBestseller = p.IsBestseller,
        };
    }

    private static List<string> GetOrderedImageUrls(Models.Product p)
    {
        if (p.ProductImages.Count > 0)
        {
            return MediaUrlNormalizer.NormalizeList(p.ProductImages
                .OrderBy(pi => pi.SortOrder)
                .ThenBy(pi => pi.Id)
                .Select(pi => pi.ImageUrl));
        }

        var legacy = NormalizeUrl(p.ImageUrl);
        return string.IsNullOrEmpty(legacy) ? new List<string>() : new List<string> { legacy };
    }

    private static List<string> BuildDetailsList(Models.Product p) => new();

    private static List<string> NormalizeUrls(IEnumerable<string>? urls) =>
        MediaUrlNormalizer.NormalizeList(urls);

    private static string? NormalizeUrl(string? url) =>
        MediaUrlNormalizer.NormalizeForStorage(url);

    private static List<string> DistinctPreserveOrder(IEnumerable<string> urls)
    {
        var result = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var raw in urls)
        {
            if (string.IsNullOrWhiteSpace(raw))
                continue;

            var url = raw.Trim();
            if (seen.Add(url))
                result.Add(url);
        }

        return result;
    }

    private static List<ColorVariantInput> NormalizeColorVariants(IEnumerable<ColorVariantInput>? variants)
    {
        var normalized = new List<ColorVariantInput>();
        if (variants == null)
            return normalized;

        var seenColorIds = new HashSet<int>();
        foreach (var variant in variants)
        {
            if (variant.ColorId <= 0 || !seenColorIds.Add(variant.ColorId))
                continue;

            normalized.Add(new ColorVariantInput
            {
                ColorId = variant.ColorId,
                ImageUrls = NormalizeUrls(variant.ImageUrls),
            });
        }

        return normalized;
    }

    private static List<int> ResolveColorIds(
        List<int>? requestColorIds,
        List<ColorVariantInput>? legacyVariants,
        List<ColorSizeVariantInput>? colorSizeVariants)
    {
        return (requestColorIds ?? new List<int>())
            .Concat((legacyVariants ?? new List<ColorVariantInput>()).Select(v => v.ColorId))
            .Concat((colorSizeVariants ?? new List<ColorSizeVariantInput>()).Select(v => v.ColorId))
            .Where(id => id > 0)
            .Distinct()
            .ToList();
    }

    private static List<ColorSizeVariantInput> BuildColorSizeVariantsForWrite(
        List<ColorSizeVariantInput>? colorSizeVariants,
        List<ColorVariantInput>? legacyColorVariants,
        List<int> fallbackColorIds,
        int? defaultSizeId,
        List<string> fallbackImageUrls)
    {
        var explicitVariants = (colorSizeVariants ?? new List<ColorSizeVariantInput>())
            .Where(v => v.ColorId > 0 && v.SizeId > 0)
            .Select(v => new ColorSizeVariantInput
            {
                ColorId = v.ColorId,
                SizeId = v.SizeId,
                Lace = v.Lace,
                ImageUrls = NormalizeUrls(v.ImageUrls),
            })
            .Where(v => v.ImageUrls.Count > 0)
            .GroupBy(v => (v.ColorId, v.SizeId, v.Lace))
            .Select(g => new ColorSizeVariantInput
            {
                ColorId = g.Key.ColorId,
                SizeId = g.Key.SizeId,
                Lace = g.Key.Lace,
                ImageUrls = g.SelectMany(x => x.ImageUrls).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            })
            .ToList();

        if (explicitVariants.Count > 0)
            return explicitVariants;

        if (defaultSizeId is int dSize)
        {
            var legacy = NormalizeColorVariants(legacyColorVariants)
                .Select(v => new ColorSizeVariantInput
                {
                    ColorId = v.ColorId,
                    SizeId = dSize,
                    ImageUrls = NormalizeUrls(v.ImageUrls),
                })
                .Where(v => v.ImageUrls.Count > 0)
                .ToList();
            if (legacy.Count > 0)
                return legacy;

            var fromFallback = BuildFallbackColorSizeVariants(fallbackColorIds, dSize, fallbackImageUrls);
            if (fromFallback.Count > 0)
                return fromFallback;
        }

        return new List<ColorSizeVariantInput>();
    }

    private static List<ColorSizeVariantInput> BuildFallbackColorSizeVariants(
        IEnumerable<int> colorIds,
        int defaultSizeId,
        List<string> fallbackImageUrls)
    {
        var result = new List<ColorSizeVariantInput>();
        var uniqueColorIds = colorIds.Where(colorId => colorId > 0).Distinct().ToList();
        for (var i = 0; i < uniqueColorIds.Count; i++)
        {
            var colorId = uniqueColorIds[i];
            var variantUrls = fallbackImageUrls.Count > i
                ? new List<string> { fallbackImageUrls[i] }
                : fallbackImageUrls.Count > 0
                    ? new List<string> { fallbackImageUrls[0] }
                    : new List<string>();

            if (variantUrls.Count == 0)
                continue;

            result.Add(new ColorSizeVariantInput
            {
                ColorId = colorId,
                SizeId = defaultSizeId,
                ImageUrls = variantUrls,
            });
        }

        return result;
    }

    private async Task<List<int>> ResolveSizeIdsAsync(IEnumerable<int>? requestedSizeIds, int? requestedDefaultSizeId, IEnumerable<int>? variantSizeIds, CancellationToken ct)
    {
        var candidateIds = (requestedSizeIds ?? new List<int>())
            .Concat(variantSizeIds ?? new List<int>())
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (requestedDefaultSizeId is int defaultId && defaultId > 0 && !candidateIds.Contains(defaultId))
            candidateIds.Add(defaultId);

        var validIds = await _context.Sizes
            .Where(s => candidateIds.Contains(s.Id))
            .Select(s => s.Id)
            .ToListAsync(ct);

        if (validIds.Count > 0)
            return validIds;

        var fallback = await _context.Sizes
            .Where(s => s.Name == "M" || s.Name == "One Size")
            .OrderBy(s => s.Name == "M" ? 0 : 1)
            .Select(s => s.Id)
            .FirstOrDefaultAsync(ct);

        if (fallback > 0)
            return new List<int> { fallback };

        var firstSizeId = await _context.Sizes.OrderBy(s => s.Id).Select(s => s.Id).FirstOrDefaultAsync(ct);
        return firstSizeId > 0 ? new List<int> { firstSizeId } : new List<int>();
    }

    private async Task<int?> ResolveDefaultSizeIdAsync(List<int> validSizeIds, int? requestedDefaultSizeId, CancellationToken ct)
    {
        if (requestedDefaultSizeId is int defaultId && validSizeIds.Contains(defaultId))
            return defaultId;

        var sizeOrder = await _context.Sizes
            .Where(s => validSizeIds.Contains(s.Id))
            .Select(s => new { s.Id, s.Name })
            .ToListAsync(ct);

        var preferred = sizeOrder.FirstOrDefault(s => s.Name == "M")?.Id
            ?? sizeOrder.FirstOrDefault()?.Id;
        return preferred;
    }

    private static int? ResolveDefaultColorId(List<int> validColorIds, int? requestedDefaultColorId)
    {
        if (requestedDefaultColorId is int defaultId && validColorIds.Contains(defaultId))
            return defaultId;

        return validColorIds.FirstOrDefault() is int first && first > 0 ? first : null;
    }

    private static List<int> OrderColorIdsWithDefault(List<int> colorIds, int? defaultColorId)
    {
        if (defaultColorId is not int defaultId || !colorIds.Contains(defaultId))
            return colorIds;

        return new[] { defaultId }
            .Concat(colorIds.Where(id => id != defaultId))
            .ToList();
    }

    private async Task ReplaceProductImagesAsync(int productId, IEnumerable<string> urls, CancellationToken ct)
    {
        var existing = await _context.ProductImages.Where(pi => pi.ProductId == productId).ToListAsync(ct);
        _context.ProductImages.RemoveRange(existing);
        var normalized = NormalizeUrls(urls);
        for (var i = 0; i < normalized.Count; i++)
        {
            _context.ProductImages.Add(new Models.ProductImage
            {
                ProductId = productId,
                ImageUrl = normalized[i],
                SortOrder = i,
                IsPrimary = i == 0,
            });
        }
    }

    private async Task ReplaceProductSizesAsync(int productId, List<int> sizeIds, CancellationToken ct)
    {
        // Clear size-bound children first because ProductSize FK is NO ACTION.
        var existingSizeImages = await _context.ProductColorSizeImages.Where(v => v.ProductId == productId).ToListAsync(ct);
        _context.ProductColorSizeImages.RemoveRange(existingSizeImages);
        var existingVariantStocks = await _context.ProductVariantStocks.Where(v => v.ProductId == productId).ToListAsync(ct);
        _context.ProductVariantStocks.RemoveRange(existingVariantStocks);

        var existing = await _context.ProductSizes.Where(ps => ps.ProductId == productId).ToListAsync(ct);
        _context.ProductSizes.RemoveRange(existing);
        for (var i = 0; i < sizeIds.Count; i++)
        {
            _context.ProductSizes.Add(new Models.ProductSize
            {
                ProductId = productId,
                SizeId = sizeIds[i],
                SortOrder = i,
            });
        }
    }

    private async Task ReplaceProductColorsAsync(int productId, List<int> colorIds, CancellationToken ct)
    {
        var existing = await _context.ProductColors.Where(pc => pc.ProductId == productId).ToListAsync(ct);
        _context.ProductColors.RemoveRange(existing);

        for (var i = 0; i < colorIds.Count; i++)
        {
            _context.ProductColors.Add(new Models.ProductColor
            {
                ProductId = productId,
                ColorId = colorIds[i],
                SortOrder = i,
            });
        }
    }

    private async Task ReplaceProductFurnitureColorsAsync(int productId, List<int> furnitureColorIds, CancellationToken ct)
    {
        var existing = await _context.ProductFurnitureColors.Where(pc => pc.ProductId == productId).ToListAsync(ct);
        _context.ProductFurnitureColors.RemoveRange(existing);

        for (var i = 0; i < furnitureColorIds.Count; i++)
        {
            _context.ProductFurnitureColors.Add(new Models.ProductFurnitureColor
            {
                ProductId = productId,
                FurnitureColorId = furnitureColorIds[i],
                SortOrder = i,
            });
        }
    }

    private async Task ReplaceColorSizeImagesAsync(int productId, List<ColorSizeVariantInput> variants, CancellationToken ct)
    {
        var existing = await _context.ProductColorSizeImages.Where(v => v.ProductId == productId).ToListAsync(ct);
        _context.ProductColorSizeImages.RemoveRange(existing);

        foreach (var variant in variants)
        {
            for (var i = 0; i < variant.ImageUrls.Count; i++)
            {
                _context.ProductColorSizeImages.Add(new Models.ProductColorSizeImage
                {
                    ProductId = productId,
                    ColorId = variant.ColorId,
                    SizeId = variant.SizeId,
                    Lace = variant.Lace,
                    ImageUrl = variant.ImageUrls[i],
                    SortOrder = i,
                });
            }
        }
    }

    private async Task ReplaceVariantStocksAsync(int productId, IEnumerable<VariantStockInput> variantStocks, CancellationToken ct)
    {
        var existing = await _context.ProductVariantStocks.Where(v => v.ProductId == productId).ToListAsync(ct);
        _context.ProductVariantStocks.RemoveRange(existing);

        var normalized = (variantStocks ?? new List<VariantStockInput>())
            .Where(v => v.ColorId > 0 && v.SizeId > 0 && v.QuantityInStock >= 0)
            .GroupBy(v => (v.ColorId, v.SizeId, v.Lace))
            .Select(g => g.Last())
            .ToList();

        foreach (var stock in normalized)
        {
            _context.ProductVariantStocks.Add(new Models.ProductVariantStock
            {
                ProductId = productId,
                ColorId = stock.ColorId,
                SizeId = stock.SizeId,
                Lace = stock.Lace,
                QuantityInStock = stock.QuantityInStock,
            });
        }
    }

    private async Task ReplaceProductRecommendationsAsync(
        int productId,
        string productCode,
        List<string>? codes,
        CancellationToken ct)
    {
        if (codes == null) return;

        ValidateSuggestedProductCodes(codes);

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId, ct);
        if (product == null) return;
        product.SuggestionsConfigured = true;

        var normalized = codes
            .Select(c => c?.Trim())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Where(c => !string.Equals(c, productCode, StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxSuggestedProductCount)
            .ToList();

        var existing = await _context.ProductRecommendations.Where(r => r.ProductId == productId).ToListAsync(ct);
        _context.ProductRecommendations.RemoveRange(existing);

        if (normalized.Count == 0)
            return;

        var relatedProducts = await _context.Products
            .AsNoTracking()
            .Where(p => p.Id != productId)
            .Select(p => new { p.Id, p.ProductCode })
            .ToListAsync(ct);

        var byCode = relatedProducts.ToDictionary(p => p.ProductCode, StringComparer.OrdinalIgnoreCase);
        var invalidCodes = normalized.Where(code => !byCode.ContainsKey(code!)).ToList();
        if (invalidCodes.Count > 0)
        {
            throw new ProductValidationException(
                $"Unknown suggested product codes: {string.Join(", ", invalidCodes)}",
                invalidCodes!);
        }

        var sortOrder = 0;
        foreach (var code in normalized)
        {
            if (string.IsNullOrWhiteSpace(code))
                continue;

            var related = byCode[code];
            _context.ProductRecommendations.Add(new Models.ProductRecommendation
            {
                ProductId = productId,
                RelatedProductId = related.Id,
                SortOrder = sortOrder++,
            });
        }
    }

    private static void ValidateSuggestedProductCodes(IReadOnlyList<string> codes)
    {
        if (codes.Count > MaxSuggestedProductCount)
            throw new ProductValidationException($"At most {MaxSuggestedProductCount} suggested products are allowed.");

        foreach (var code in codes)
        {
            if (string.IsNullOrWhiteSpace(code))
                continue;

            if (code.Trim().Length > 50)
                throw new ProductValidationException("Each suggested product code must be 50 characters or fewer.");
        }
    }

    private static int ComputeTotalStock(int explicitStock, IEnumerable<VariantStockInput>? variantStocks)
    {
        var variants = (variantStocks ?? new List<VariantStockInput>()).ToList();
        if (variants.Count > 0)
        {
            return variants
                .Where(v => v.QuantityInStock >= 0)
                .Sum(v => v.QuantityInStock);
        }

        return Math.Max(0, explicitStock);
    }
}
