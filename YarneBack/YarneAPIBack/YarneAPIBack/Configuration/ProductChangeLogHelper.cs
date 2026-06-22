using System.Globalization;
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

        var summaryParts = new List<string>();
        foreach (var (key, change) in changes)
        {
            summaryParts.Add(FormatSummaryPart(key, change));
        }

        if (addedImageUrls.Count > 0)
            summaryParts.Add($"{addedImageUrls.Count} image{(addedImageUrls.Count == 1 ? "" : "s")} added");
        if (removedImageUrls.Count > 0)
            summaryParts.Add($"{removedImageUrls.Count} image{(removedImageUrls.Count == 1 ? "" : "s")} removed");

        var summary = summaryParts.Count > 0
            ? $"Updated product \"{after.Name}\" ({after.ProductCode}): {string.Join(", ", summaryParts)}"
            : $"Updated product \"{after.Name}\" ({after.ProductCode})";

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

    private static string FormatSummaryPart(string key, FieldChange change)
    {
        return key switch
        {
            "price" => $"price {FormatDecimal(change.From)} → {FormatDecimal(change.To)}",
            "quantityInStock" => $"stock {change.From} → {change.To}",
            "isActive" => $"active {change.From} → {change.To}",
            "isNew" => $"new flag {change.From} → {change.To}",
            "isBestseller" => $"bestseller {change.From} → {change.To}",
            "lace" => $"lace {change.From} → {change.To}",
            "categoryName" => $"category {change.From} → {change.To}",
            "productCode" => $"SKU {change.From} → {change.To}",
            "name" => $"name {change.From} → {change.To}",
            "material" => $"material {change.From} → {change.To}",
            _ => $"{key} {change.From} → {change.To}",
        };
    }

    private static string FormatDecimal(object? value)
    {
        if (value is decimal d)
            return $"€{d.ToString("0.##", CultureInfo.InvariantCulture)}";
        return value?.ToString() ?? "—";
    }

    private sealed class FieldChange
    {
        [JsonPropertyName("from")]
        public object? From { get; init; }

        [JsonPropertyName("to")]
        public object? To { get; init; }
    }
}
