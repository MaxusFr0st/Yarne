namespace YarneAPIBack.Services.Contracts;

public sealed class NormalizedUploadImage
{
    public required Stream Output { get; init; }
    public required string FileExtension { get; init; }
    public required string ContentType { get; init; }
    public int Width { get; init; }
    public int Height { get; init; }
}

public interface IImageUploadNormalizer
{
    /// <summary>
    /// Converts uploads to sRGB WebP: auto-orients, resizes, strips wide-gamut/HDR metadata.
    /// </summary>
    Task<NormalizedUploadImage> NormalizeAsync(Stream input, CancellationToken ct = default);
}
