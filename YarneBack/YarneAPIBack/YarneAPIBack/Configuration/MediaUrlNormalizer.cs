namespace YarneAPIBack.Configuration;

/// <summary>
/// Store and return upload paths as /uploads/... so every client resolves them against the current API host.
/// </summary>
public static class MediaUrlNormalizer
{
    public static string? NormalizeForStorage(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        var trimmed = url.Trim();
        if (trimmed.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return trimmed;

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute)
            && absolute.AbsolutePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return absolute.AbsolutePath;
        }

        if (trimmed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return trimmed;

        return trimmed;
    }

    public static List<string> NormalizeList(IEnumerable<string>? urls)
    {
        var normalized = new List<string>();
        if (urls == null)
            return normalized;

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in urls)
        {
            var url = NormalizeForStorage(raw);
            if (string.IsNullOrWhiteSpace(url))
                continue;

            if (seen.Add(url))
                normalized.Add(url);
        }

        return normalized;
    }
}
