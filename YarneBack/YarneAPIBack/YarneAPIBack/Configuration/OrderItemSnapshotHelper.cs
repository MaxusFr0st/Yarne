using YarneAPIBack.Models;

namespace YarneAPIBack.Configuration;

public static class OrderItemSnapshotHelper
{
    public static void ApplyProductSnapshot(OrderItem item, Product product)
    {
        item.ProductId = product.Id;
        item.ProductName = product.Name;
        item.ProductCode = product.ProductCode;
        item.ProductImageUrl = ResolvePrimaryImageUrl(product);
    }

    public static string ResolveProductName(OrderItem item) =>
        !string.IsNullOrWhiteSpace(item.ProductName)
            ? item.ProductName
            : item.Product?.Name ?? "Product";

    public static string ResolveProductCode(OrderItem item) =>
        !string.IsNullOrWhiteSpace(item.ProductCode)
            ? item.ProductCode
            : item.Product?.ProductCode ?? string.Empty;

    public static string? ResolveProductImageUrl(OrderItem item) =>
        !string.IsNullOrWhiteSpace(item.ProductImageUrl)
            ? item.ProductImageUrl
            : ResolvePrimaryImageUrl(item.Product);

    public static string? ResolvePrimaryImageUrl(Product? product)
    {
        if (product == null) return null;

        var primary = product.ProductImages?
            .OrderByDescending(pi => pi.IsPrimary)
            .ThenBy(pi => pi.SortOrder)
            .ThenBy(pi => pi.Id)
            .Select(pi => pi.ImageUrl)
            .FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(primary))
            return primary;

        var colorPrimary = product.ProductColors?
            .SelectMany(pc => pc.Images)
            .OrderBy(pi => pi.SortOrder)
            .ThenBy(pi => pi.Id)
            .Select(pi => pi.ImageUrl)
            .FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(colorPrimary))
            return colorPrimary;

        var colorSizePrimary = product.ProductColors?
            .SelectMany(pc => pc.SizeImages)
            .OrderBy(pi => pi.SortOrder)
            .ThenBy(pi => pi.Id)
            .Select(pi => pi.ImageUrl)
            .FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(colorSizePrimary))
            return colorSizePrimary;

        return product.ImageUrl;
    }
}
