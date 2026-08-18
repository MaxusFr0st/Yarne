namespace YarneAPIBack.Services.Contracts;

public interface IR2ImageStorageService
{
    bool IsConfigured { get; }

    /// <summary>Uploads content to the R2 bucket and returns its public URL.</summary>
    Task<string> UploadAsync(Stream content, string contentType, string fileExtension, CancellationToken ct = default);

    /// <summary>Deletes the object for a previously returned public URL, if it belongs to this bucket.</summary>
    Task DeleteAsync(string? publicUrl, CancellationToken ct = default);
}
