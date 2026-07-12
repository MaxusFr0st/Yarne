namespace YarneAPIBack.Services.Contracts;

public interface IUploadFileStorageService
{
    /// <summary>Normalize a stored or absolute URL to a /uploads/... path, or null.</summary>
    string? NormalizeUploadPath(string? url);

    /// <summary>Resolve a /uploads/... path to an on-disk file path under wwwroot/uploads.</summary>
    bool TryResolveLocalPath(string uploadPath, out string filePath);

    /// <summary>Delete the on-disk file for an upload path when it is not referenced anywhere.</summary>
    Task<bool> TryDeleteIfUnreferencedAsync(string? url, CancellationToken ct = default);

    /// <summary>Delete on-disk files for upload paths removed between two URL sets.</summary>
    Task DeleteRemovedIfUnreferencedAsync(
        IEnumerable<string?> previousUrls,
        IEnumerable<string?> nextUrls,
        CancellationToken ct = default);

    /// <summary>Extract /uploads/... paths from a JSON payload.</summary>
    IReadOnlyList<string> ExtractUploadPathsFromJson(string? json);
}
