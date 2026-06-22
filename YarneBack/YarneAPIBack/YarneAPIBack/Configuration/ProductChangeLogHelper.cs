using System.Text.Json.Serialization;
using YarneAPIBack.DTOs.Product;

namespace YarneAPIBack.Configuration;

public sealed class ProductUpdateLogResult
{
    public bool HasChanges { get; init; }
    public string Summary { get; init; } = "";
    public Dictionary<string, object> Details { get; init; } = new();
}

public static class ProductChangeLogHelper
{
    public static ProductUpdateLogResult BuildUpdateLog(
        ProductDetailDto? before,
        ProductDto after,
        IReadOnlyList<string> addedImageUrls,
        IReadOnlyList<string> removedImageUrls)
    {
        var changes = new Dictionary<string, FieldChange>();

        if (before != null)
        {
            RecordChange(changes, "name", before.Name, after.Name);
            RecordChange(changes, "productCode", before.ProductCode, after.ProductCode);
            RecordChange(changes, "description", before.Description, after.Description);
            RecordChange(changes, "price", before.Price, after.Price);
            RecordChange(changes, "quantityInStock", before.QuantityInStock, after.QuantityInStock);
            RecordChange(changes, "material", before.Material, after.Material);
            RecordChange(changes, "categoryName", before.CategoryName, after.CategoryName);
            RecordChange(changes, "isActive", before.IsActive, after.IsActive);
            RecordChange(changes, "isNew", before.IsNew, after.IsNew);
            RecordChange(changes, "isBestseller", before.IsBestseller, after.IsBestseller);
            RecordChange(changes, "lace", before.Lace, after.Lace);
        }

        var hasFieldChanges = changes.Count > 0;
        var hasImageChanges = addedImageUrls.Count > 0 || removedImageUrls.Count > 0;
        var hasChanges = hasFieldChanges || hasImageChanges;

        // Summary is intentionally concise — structured diffs are in DetailsJson for rich UI rendering.
        var summary = $"Updated product \"{after.Name}\" ({after.ProductCode})";

        var details = new Dictionary<string, object>();
        if (changes.Count > 0)
            details["changes"] = changes;

        if (addedImageUrls.Count > 0)
            details["addedImageUrls"] = addedImageUrls;

        if (removedImageUrls.Count > 0)
            details["removedImageUrls"] = removedImageUrls;

        return new ProductUpdateLogResult
        {
            HasChanges = hasChanges,
            Summary = summary,
            Details = details,
        };
    }

    private static void RecordChange<T>(Dictionary<string, FieldChange> changes, string key, T? before, T? after)
    {
        if (EqualityComparer<T>.Default.Equals(before, after))
            return;

        changes[key] = new FieldChange
        {
            From = before,
            To = after,
        };
    }

    private sealed class FieldChange
    {
        [JsonPropertyName("from")]
        public object? From { get; init; }

        [JsonPropertyName("to")]
        public object? To { get; init; }
    }
}
