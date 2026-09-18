namespace YarneAPIBack.Services.Contracts;

public interface IR2ImageStorageService
{
    bool IsConfigured { get; }

    /// <summary>Uploads content to the R2 bucket and returns its public URL.</summary>
    Task<string> UploadAsync(Stream content, string contentType, string fileExtension, CancellationToken ct = default);

    /// <summary>
    /// Uploads content under a caller-chosen key and returns its public URL. Used by the
    /// /uploads → R2 migration, which reuses each file's existing GUID filename as the key so
    /// a re-run lands on the same object instead of minting a second copy.
    /// </summary>
    Task<string> UploadWithKeyAsync(Stream content, string contentType, string key, CancellationToken ct = default);

    /// <summary>Whether an object already exists under this key. Lets the migration skip finished work.</summary>
    Task<bool> ExistsAsync(string key, CancellationToken ct = default);

    /// <summary>Builds the public URL for a key without uploading.</summary>
    string BuildPublicUrl(string key);

    /// <summary>Deletes the object for a previously returned public URL, if it belongs to this bucket.</summary>
    Task DeleteAsync(string? publicUrl, CancellationToken ct = default);
}
