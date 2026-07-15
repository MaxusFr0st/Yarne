namespace YarneAPIBack.Services.Contracts;

public sealed class NormalizedUploadImage
{
    public required Stream Output { get; init; }
    public required string FileExtension { get; init; }
    public required string ContentType { get; init; }
    public int Width { get; init; }
    public int Height { get; init; }
    public float FocalX { get; init; } = 0.5f;
    public float FocalY { get; init; } = 0.35f;
}

public interface IImageUploadNormalizer
{
    /// <summary>
    /// Converts uploads to sRGB WebP: auto-orients, resizes, strips wide-gamut/HDR metadata.
    /// Also auto-detects focal point via edge-energy analysis.
    /// </summary>
    Task<NormalizedUploadImage> NormalizeAsync(Stream input, CancellationToken ct = default);
}
