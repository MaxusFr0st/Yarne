using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace YarneAPIBack.Services;

/// <summary>
/// Detects the focal point of a product image using edge-energy analysis.
/// Returns normalized (0–1) coordinates representing where the interesting subject is.
/// </summary>
public static class FocalPointDetector
{
    private const int WorkingSize = 256;
    private const int GridSize = 16;
    private const float DefaultX = 0.5f;
    private const float DefaultY = 0.35f;
    private const float ClampMin = 0.15f;
    private const float ClampMax = 0.85f;
    private const float UpperNudge = 0.08f;

    public static (float FocalX, float FocalY) Detect(Image<Rgba32> image)
    {
        if (image.Width < 8 || image.Height < 8)
            return (DefaultX, DefaultY);

        using var working = image.Clone(ctx =>
        {
            var scale = (float)WorkingSize / Math.Max(image.Width, image.Height);
            var newW = Math.Max(1, (int)(image.Width * scale));
            var newH = Math.Max(1, (int)(image.Height * scale));
            ctx.Resize(newW, newH, KnownResamplers.NearestNeighbor);
        });

        var w = working.Width;
        var h = working.Height;

        var gray = new float[h, w];
        working.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < h; y++)
            {
                var row = accessor.GetRowSpan(y);
                for (var x = 0; x < w; x++)
                {
                    var px = row[x];
                    gray[y, x] = 0.2126f * px.R + 0.7152f * px.G + 0.0722f * px.B;
                }
            }
        });

        var gradient = new float[h, w];
        for (var y = 1; y < h - 1; y++)
        {
            for (var x = 1; x < w - 1; x++)
            {
                var gx =
                    -gray[y - 1, x - 1] + gray[y - 1, x + 1]
                    - 2f * gray[y, x - 1] + 2f * gray[y, x + 1]
                    - gray[y + 1, x - 1] + gray[y + 1, x + 1];

                var gy =
                    -gray[y - 1, x - 1] - 2f * gray[y - 1, x] - gray[y - 1, x + 1]
                    + gray[y + 1, x - 1] + 2f * gray[y + 1, x] + gray[y + 1, x + 1];

                gradient[y, x] = MathF.Sqrt(gx * gx + gy * gy);
            }
        }

        var cellW = w / GridSize;
        var cellH = h / GridSize;
        if (cellW < 1 || cellH < 1)
            return (DefaultX, DefaultY);

        var cellEnergy = new float[GridSize, GridSize];
        var totalEnergy = 0.0;
        var count = 0;

        for (var cy = 0; cy < GridSize; cy++)
        {
            for (var cx = 0; cx < GridSize; cx++)
            {
                var startX = cx * cellW;
                var startY = cy * cellH;
                var endX = Math.Min(startX + cellW, w);
                var endY = Math.Min(startY + cellH, h);

                var sum = 0f;
                for (var py = startY; py < endY; py++)
                    for (var px = startX; px < endX; px++)
                        sum += gradient[py, px];

                cellEnergy[cy, cx] = sum;
                totalEnergy += sum;
                count++;
            }
        }

        if (totalEnergy < 1e-6)
            return (DefaultX, DefaultY);

        var mean = (float)(totalEnergy / count);
        var variance = 0.0;
        for (var cy = 0; cy < GridSize; cy++)
            for (var cx = 0; cx < GridSize; cx++)
                variance += (cellEnergy[cy, cx] - mean) * (cellEnergy[cy, cx] - mean);
        var stddev = (float)Math.Sqrt(variance / count);

        var threshold = mean + 0.5f * stddev;

        var weightedX = 0.0;
        var weightedY = 0.0;
        var totalWeight = 0.0;

        for (var cy = 0; cy < GridSize; cy++)
        {
            for (var cx = 0; cx < GridSize; cx++)
            {
                if (cellEnergy[cy, cx] < threshold)
                    continue;

                var centerX = (cx + 0.5) / GridSize;
                var centerY = (cy + 0.5) / GridSize;
                var weight = (double)cellEnergy[cy, cx];

                weightedX += centerX * weight;
                weightedY += centerY * weight;
                totalWeight += weight;
            }
        }

        if (totalWeight < 1e-6)
            return (DefaultX, DefaultY);

        var focalX = (float)(weightedX / totalWeight);
        var focalY = (float)(weightedY / totalWeight);

        if (focalY > 0.3f)
            focalY -= UpperNudge;

        focalX = Math.Clamp(focalX, ClampMin, ClampMax);
        focalY = Math.Clamp(focalY, ClampMin, ClampMax);

        return (focalX, focalY);
    }
}
