using YarneAPIBack.DTOs.Product;

namespace YarneAPIBack.Configuration;

public static class ProductLogImageHelper
{
    public static List<string> CollectImageUrls(ProductDto product)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var urls = new List<string>();

        void Add(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return;
            var trimmed = url.Trim();
            if (seen.Add(trimmed))
                urls.Add(trimmed);
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
        var beforeSet = new HashSet<string>(before, StringComparer.OrdinalIgnoreCase);
        var afterSet = new HashSet<string>(after, StringComparer.OrdinalIgnoreCase);

        var added = after.Where(u => !beforeSet.Contains(u)).ToList();
        var removed = before.Where(u => !afterSet.Contains(u)).ToList();
        return (added, removed);
    }
}
