using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public sealed class ImageUploadNormalizer : IImageUploadNormalizer
{
    private const int MaxLongEdge = 2048;
    private const int WebpQuality = 82;

    public async Task<NormalizedUploadImage> NormalizeAsync(Stream input, CancellationToken ct = default)
    {
        using var image = await Image.LoadAsync<Rgba32>(input, ct);

        // Animated GIFs: keep first frame only for product photos.
        if (image.Frames.Count > 1)
        {
            using var firstFrame = image.Frames.CloneFrame(0);
            PrepareForEncode(firstFrame);
            var focal = FocalPointDetector.Detect(firstFrame);
            return await EncodeAsync(firstFrame, focal, ct);
        }

        image.Mutate(ctx => ctx.AutoOrient());

        // Detect focal point on the full-res oriented image before any resize.
        var focalPoint = FocalPointDetector.Detect(image);

        if (image.Width > MaxLongEdge || image.Height > MaxLongEdge)
        {
            image.Mutate(ctx => ctx.Resize(new ResizeOptions
            {
                Size = new Size(MaxLongEdge, MaxLongEdge),
                Mode = ResizeMode.Max,
                Sampler = KnownResamplers.Lanczos3,
            }));
        }

        return await EncodeAsync(image, focalPoint, ct);
    }

    private static void PrepareForEncode(Image<Rgba32> image)
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

    private static async Task<NormalizedUploadImage> EncodeAsync(
        Image<Rgba32> image, (float FocalX, float FocalY) focal, CancellationToken ct)
    {
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
                FocalX = focal.FocalX,
                FocalY = focal.FocalY,
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
            FocalX = focal.FocalX,
            FocalY = focal.FocalY,
        };
    }
}
