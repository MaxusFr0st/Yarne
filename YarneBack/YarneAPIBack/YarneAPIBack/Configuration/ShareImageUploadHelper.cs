using SixLabors.ImageSharp;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Configuration;

/// <summary>Normalizes and uploads a share-photo file to R2. Shared by per-product and site-default share image endpoints.</summary>
public static class ShareImageUploadHelper
{
    public sealed class UploadResult
    {
        public string? Url { get; init; }
        public string? Error { get; init; }
    }

    public static async Task<UploadResult> UploadAsync(
        IFormFile? file,
        IImageUploadNormalizer normalizer,
        IR2ImageStorageService r2Storage,
        CancellationToken ct)
    {
        if (!r2Storage.IsConfigured)
            return new UploadResult { Error = "R2 storage is not configured" };
        if (file == null || file.Length == 0)
            return new UploadResult { Error = "No file uploaded" };

        NormalizedUploadImage normalized;
        await using (var uploadStream = file.OpenReadStream())
        {
            try
            {
                normalized = await normalizer.NormalizeAsync(uploadStream, ct);
            }
            catch (UnknownImageFormatException)
            {
                return new UploadResult { Error = "Could not read image file" };
            }
            catch (InvalidImageContentException)
            {
                return new UploadResult { Error = "Image file is corrupted or unsupported" };
            }
        }

        await using (normalized.Output)
        {
            var url = await r2Storage.UploadAsync(normalized.Output, normalized.ContentType, normalized.FileExtension, ct);
            return new UploadResult { Url = url };
        }
    }
}
