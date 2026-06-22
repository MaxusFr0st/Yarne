using YarneAPIBack.DTOs.Product;

namespace YarneAPIBack.Configuration;

public static class ProductLogImageHelper
{
    private static string NormalizeCompareKey(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return "";

        var trimmed = url.Trim();
        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute)
            && absolute.AbsolutePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return absolute.AbsolutePath;
        }

        return trimmed;
    }

    public static List<string> CollectImageUrls(ProductDto product)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var urls = new List<string>();

        void Add(string? url)
        {
            var key = NormalizeCompareKey(url);
            if (string.IsNullOrWhiteSpace(key)) return;
            if (seen.Add(key))
                urls.Add(key);
        }

        foreach (var url in product.ImageUrls ?? [])
            Add(url);

        if (!string.IsNullOrWhiteSpace(product.PrimaryImageUrl))
            Add(product.PrimaryImageUrl);

        foreach (var color in product.Colors ?? [])
        {
            foreach (var url in color.ImageUrls ?? [])
                Add(url);
            Add(color.ImageUrl);
        }

        return urls;
    }

    public static (List<string> Added, List<string> Removed) DiffImageUrls(
        IReadOnlyList<string> before,
        IReadOnlyList<string> after)
    {
        var beforeSet = new HashSet<string>(
            before.Select(NormalizeCompareKey).Where(k => k.Length > 0),
            StringComparer.OrdinalIgnoreCase);
        var afterSet = new HashSet<string>(
            after.Select(NormalizeCompareKey).Where(k => k.Length > 0),
            StringComparer.OrdinalIgnoreCase);

        var added = after
            .Select(NormalizeCompareKey)
            .Where(k => k.Length > 0 && !beforeSet.Contains(k))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var removed = before
            .Select(NormalizeCompareKey)
            .Where(k => k.Length > 0 && !afterSet.Contains(k))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        return (added, removed);
    }
}
