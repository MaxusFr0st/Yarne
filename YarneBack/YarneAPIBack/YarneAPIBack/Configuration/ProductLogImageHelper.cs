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

        foreach (var img in product.Images ?? [])
            Add(img.Src);

        if (!string.IsNullOrWhiteSpace(product.PrimaryImage?.Src))
            Add(product.PrimaryImage.Src);

        foreach (var color in product.Colors ?? [])
        {
            foreach (var img in color.Images ?? [])
                Add(img.Src);
            Add(color.Image?.Src);
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
