using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Bmp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Tiff;
using SixLabors.ImageSharp.PixelFormats;
using YarneAPIBack.Services;
using Xunit;

namespace YarneAPIBack.Tests;

public class SafeImageDecodingTests
{
    private static MemoryStream Encode(SixLabors.ImageSharp.Formats.IImageEncoder encoder)
    {
        using var image = new Image<Rgba32>(40, 30, new Rgba32(200, 120, 90));
        var stream = new MemoryStream();
        image.Save(stream, encoder);
        stream.Position = 0;
        return stream;
    }

    [Fact]
    public async Task A_tiff_is_refused_even_though_the_library_could_read_it()
    {
        using var tiff = Encode(new TiffEncoder());
        await Assert.ThrowsAsync<UnknownImageFormatException>(() => new ImageUploadNormalizer().NormalizeAsync(tiff));
    }

    [Fact]
    public async Task Other_formats_outside_the_four_are_refused()
    {
        using var bmp = Encode(new BmpEncoder());
        await Assert.ThrowsAsync<UnknownImageFormatException>(() => new ImageUploadNormalizer().NormalizeAsync(bmp));
    }

    [Fact]
    public async Task A_png_still_becomes_a_webp()
    {
        using var png = Encode(new PngEncoder());
        var normalized = await new ImageUploadNormalizer().NormalizeAsync(png);
        Assert.Equal("image/webp", normalized.ContentType);
    }
}
