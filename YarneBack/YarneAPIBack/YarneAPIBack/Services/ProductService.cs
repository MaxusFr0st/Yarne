using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Product;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class ProductService : IProductService
{
    private readonly YarneDbContext _context;

    public ProductService(YarneDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<ProductDto>> GetProductsAsync(string? category = null, bool? isNew = null, bool includeInactive = false, CancellationToken ct = default)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
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
        {
            var threshold = DateTime.UtcNow.AddDays(-30);
            query = query.Where(p => p.CreatedAt >= threshold);
        }

        var products = await query.OrderBy(p => p.Name).ToListAsync(ct);

        return products.Select(MapToProductDto).ToList();
    }

    public async Task<ProductDetailDto?> GetProductByIdAsync(int id, CancellationToken ct = default)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
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
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        return product == null ? null : MapToProductDetailDto(product);
    }

    public async Task<ProductDetailDto?> GetProductByCodeAsync(string productCode, CancellationToken ct = default)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
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
            .FirstOrDefaultAsync(p => p.ProductCode == productCode && p.IsActive, ct);

        return product == null ? null : MapToProductDetailDto(product);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken ct = default)
    {
        var validSizeIds = await ResolveSizeIdsAsync(request.SizeIds, request.DefaultSizeId, request.ColorSizeVariants.Select(v => v.SizeId), ct);
        var defaultSizeId = await ResolveDefaultSizeIdAsync(validSizeIds, request.DefaultSizeId, ct);
        var computedTotalStock = request.QuantityInStock > 0
            ? request.QuantityInStock
            : ComputeTotalStock(request.QuantityInStock, request.VariantStocks);

        var product = new Models.Product
        {
            ProductCode = request.ProductCode,
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
        };
        _context.Products.Add(product);
        await _context.SaveChangesAsync(ct);

        await ReplaceProductImagesAsync(product.Id, request.ImageUrls, ct);
        await ReplaceProductSizesAsync(product.Id, validSizeIds, ct);

        var colorIds = ResolveColorIds(request.ColorIds, request.ColorVariants, request.ColorSizeVariants);
        await ReplaceProductColorsAsync(product.Id, colorIds, ct);

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

        await _context.SaveChangesAsync(ct);

        var created = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
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

    public async Task<ProductDto?> UpdateProductAsync(int id, UpdateProductRequest request, CancellationToken ct = default)
    {
        var product = await _context.Products
            .Include(p => p.ProductImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.Images)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.SizeImages)
            .Include(p => p.ProductColors)
                .ThenInclude(pc => pc.VariantStocks)
            .Include(p => p.ProductSizes)
            .Include(p => p.DefaultSize)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product == null) return null;

        product.ProductCode = request.ProductCode;
        product.Name = request.Name;
        product.Description = request.Description;
        product.Price = request.Price;
        product.QuantityInStock = ComputeTotalStock(request.QuantityInStock, request.VariantStocks);
        product.Material = request.Material;
        product.CategoryId = request.CategoryId;
        product.CollectionId = request.CollectionId;
        product.ProducerName = request.ProducerName;
        product.IsActive = request.IsActive;

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
        if (shouldUpdateColors)
        {
            var colorIds = ResolveColorIds(request.ColorIds, request.ColorVariants, request.ColorSizeVariants);
            await ReplaceProductColorsAsync(product.Id, colorIds, ct);
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

        await _context.SaveChangesAsync(ct);

        var updated = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Collection)
            .Include(p => p.DefaultSize)
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
        return MapToProductDto(updated);
    }

    public async Task<bool> DeleteProductAsync(int id, CancellationToken ct = default)
    {
        var product = await _context.Products.FindAsync(new object[] { id }, ct);
        if (product == null) return false;
        _context.Products.Remove(product);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    private static ProductDto MapToProductDto(Models.Product p)
    {
        var images = GetOrderedImageUrls(p);
        var sizes = p.ProductSizes
            .OrderBy(ps => ps.SortOrder)
            .Select(ps => ps.Size.Name)
            .ToList();
        var defaultSize = p.DefaultSize?.Name ?? sizes.FirstOrDefault();

        var colors = p.ProductColors.Count > 0
            ? p.ProductColors.OrderBy(pc => pc.SortOrder).Select((pc, i) =>
            {
                var sizeImages = pc.SizeImages
                    .GroupBy(si => si.ProductSize.Size.Name)
                    .ToDictionary(
                        g => g.Key,
                        g => DistinctPreserveOrder(g.OrderBy(si => si.SortOrder).Select(si => si.ImageUrl))
                    );
                var sizeStocks = pc.VariantStocks
                    .GroupBy(vs => vs.ProductSize.Size.Name)
                    .ToDictionary(g => g.Key, g => g.Sum(v => v.QuantityInStock));

                var defaultSizeImages = (!string.IsNullOrWhiteSpace(defaultSize) && sizeImages.TryGetValue(defaultSize, out var imgsForDefault))
                    ? imgsForDefault
                    : sizeImages.Values.FirstOrDefault() ?? new List<string>();

                var colorImages = defaultSizeImages.Count > 0
                    ? defaultSizeImages
                    : DistinctPreserveOrder(pc.Images.OrderBy(pi => pi.SortOrder).Select(pi => pi.ImageUrl));

                var fallback = images.Count > i ? images[i] : images.FirstOrDefault() ?? p.ImageUrl ?? "";
                return new ColorVariantDto
                {
                    Name = pc.Color.Name,
                    Hex = pc.Color.HexCode,
                    ImageUrl = colorImages.Count > 0 ? colorImages[0] : fallback,
                    ImageUrls = colorImages.Count > 0 ? colorImages : new List<string> { fallback },
                    SizeImages = sizeImages,
                    SizeStocks = sizeStocks,
                };
            }).ToList()
            : images.Select((url, i) => new ColorVariantDto
            {
                Name = $"Variant {i + 1}",
                Hex = "#2D241E",
                ImageUrl = url,
                ImageUrls = new List<string> { url },
            }).ToList();
        if (colors.Count == 0 && !string.IsNullOrEmpty(p.ImageUrl))
            colors.Add(new ColorVariantDto { Name = "Default", Hex = "#2D241E", ImageUrl = p.ImageUrl, ImageUrls = new List<string> { p.ImageUrl! } });

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
            Sizes = sizes,
            DefaultSize = defaultSize,
            CategoryName = p.Category.Name,
            CollectionName = p.Collection?.Name,
            ProducerName = p.ProducerName,
            IsActive = p.IsActive,
            CreatedAt = p.CreatedAt,
        };
    }

    private static ProductDetailDto MapToProductDetailDto(Models.Product p)
    {
        var baseDto = MapToProductDto(p);
        var isNew = p.CreatedAt >= DateTime.UtcNow.AddDays(-30);

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
            Subtitle = p.Material ?? p.ProducerName,
            IsNew = isNew,
            IsBestseller = false,
            Details = BuildDetailsList(p),
            Colors = baseDto.Colors,
        };
    }

    private static List<string> GetOrderedImageUrls(Models.Product p)
    {
        if (p.ProductImages.Count > 0)
        {
            return DistinctPreserveOrder(p.ProductImages
                .OrderBy(pi => pi.SortOrder)
                .ThenBy(pi => pi.Id)
                .Select(pi => pi.ImageUrl));
        }
        return string.IsNullOrEmpty(p.ImageUrl) ? new List<string>() : new List<string> { p.ImageUrl };
    }

    private static List<string> BuildDetailsList(Models.Product p)
    {
        var list = new List<string>();
        if (!string.IsNullOrEmpty(p.Material))
            list.Add($"Material: {p.Material}");
        if (!string.IsNullOrEmpty(p.ProducerName))
            list.Add($"Made by {p.ProducerName}");
        if (!string.IsNullOrEmpty(p.Description))
            list.Add(p.Description);
        return list.Count > 0 ? list : new List<string> { "Product details available on request." };
    }

    private static List<string> NormalizeUrls(IEnumerable<string>? urls)
    {
        var normalized = new List<string>();
        if (urls == null)
            return normalized;

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in urls)
        {
            if (string.IsNullOrWhiteSpace(raw))
                continue;

            var url = raw.Trim();
            if (seen.Add(url))
                normalized.Add(url);
        }

        return normalized;
    }

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
                ImageUrls = NormalizeUrls(v.ImageUrls),
            })
            .Where(v => v.ImageUrls.Count > 0)
            .GroupBy(v => (v.ColorId, v.SizeId))
            .Select(g => new ColorSizeVariantInput
            {
                ColorId = g.Key.ColorId,
                SizeId = g.Key.SizeId,
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
            .GroupBy(v => (v.ColorId, v.SizeId))
            .Select(g => g.Last())
            .ToList();

        foreach (var stock in normalized)
        {
            _context.ProductVariantStocks.Add(new Models.ProductVariantStock
            {
                ProductId = productId,
                ColorId = stock.ColorId,
                SizeId = stock.SizeId,
                QuantityInStock = stock.QuantityInStock,
            });
        }
    }

    private static int ComputeTotalStock(int explicitStock, IEnumerable<VariantStockInput>? variantStocks)
    {
        if (explicitStock > 0)
            return explicitStock;

        var variantSum = (variantStocks ?? new List<VariantStockInput>())
            .Where(v => v.QuantityInStock >= 0)
            .Sum(v => v.QuantityInStock);

        return variantSum > 0 ? variantSum : Math.Max(0, explicitStock);
    }
}
