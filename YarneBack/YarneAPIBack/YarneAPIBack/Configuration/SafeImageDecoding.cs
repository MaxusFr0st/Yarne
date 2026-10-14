using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Gif;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;

namespace YarneAPIBack.Configuration;

/// <summary>
/// Decoding limited to the four formats the shop accepts. ImageSharp picks a decoder from the file's
/// content, not its name, so without this a TIFF renamed to .jpg would still be decoded, and the
/// TIFF decoder in 3.1.x can be made to loop forever (GHSA-wmxv-xphr-5c9g; the fixed 4.x needs a paid
/// license). Anything else is refused as an unknown format.
/// </summary>
public static class SafeImageDecoding
{
    public static readonly DecoderOptions Options = new()
    {
        Configuration = new SixLabors.ImageSharp.Configuration(
            new JpegConfigurationModule(),
            new PngConfigurationModule(),
            new GifConfigurationModule(),
            new WebpConfigurationModule()),
    };
}
