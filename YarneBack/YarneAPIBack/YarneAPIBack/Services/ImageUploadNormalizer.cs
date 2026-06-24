using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public sealed class ImageUploadNormalizer : IImageUploadNormalizer
{
    private const int MaxLongEdge = 2048;
    private const int WebpQuality = 82;

    public async Task<NormalizedUploadImage> NormalizeAsync(Stream input, CancellationToken ct = default)
    {
        using var image = await Image.LoadAsync(input, ct);

        // Animated GIFs: keep first frame only for product photos.
        if (image.Frames.Count > 1)
        {
            using var firstFrame = image.Frames.CloneFrame(0);
            PrepareForEncode(firstFrame);
            return await EncodeAsync(firstFrame, ct);
        }

        PrepareForEncode(image);
        return await EncodeAsync(image, ct);
    }

    private static void PrepareForEncode(Image image)
    {
        image.Mutate(ctx => ctx.AutoOrient());

        if (image.Width > MaxLongEdge || image.Height > MaxLongEdge)
        {
            image.Mutate(ctx => ctx.Resize(new ResizeOptions
            {
                Size = new Size(MaxLongEdge, MaxLongEdge),
                Mode = ResizeMode.Max,
                Sampler = KnownResamplers.Lanczos3,
            }));
        }
    }

    private static async Task<NormalizedUploadImage> EncodeAsync(Image image, CancellationToken ct)
    {
        // Drop wide-gamut/HDR metadata so output is plain sRGB WebP.
        image.Metadata.ExifProfile = null;
        image.Metadata.IccProfile = null;
        image.Metadata.XmpProfile = null;

        var output = new MemoryStream();

        try
        {
            await image.SaveAsWebpAsync(output, new WebpEncoder
            {
                Quality = WebpQuality,
                Method = WebpEncodingMethod.Level4,
            }, ct);
        }
        catch (NotSupportedException)
        {
            output.Dispose();
            output = new MemoryStream();
            await image.SaveAsJpegAsync(output, new JpegEncoder { Quality = 85 }, ct);

            output.Position = 0;
            return new NormalizedUploadImage
            {
                Output = output,
                FileExtension = ".jpg",
                ContentType = "image/jpeg",
                Width = image.Width,
                Height = image.Height,
            };
        }

        output.Position = 0;
        return new NormalizedUploadImage
        {
            Output = output,
            FileExtension = ".webp",
            ContentType = "image/webp",
            Width = image.Width,
            Height = image.Height,
        };
    }
}
