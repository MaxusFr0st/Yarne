using YarneAPIBack.DTOs.Product;

namespace YarneAPIBack.Services;

/// <summary>Validation of the per-size measurements the owner types in the admin (centimetres, one decimal).</summary>
public static class ProductMeasurements
{
    public const decimal MaxCm = 500m;

    /// <summary>Null stays null; anything else must be a number with 0 &lt; value &lt;= 500 and is rounded to one decimal.</summary>
    public static decimal? NormalizeCm(decimal? value, string label)
    {
        if (value is null)
            return null;

        var rounded = decimal.Round(value.Value, 1, MidpointRounding.AwayFromZero);
        if (rounded <= 0m || rounded > MaxCm)
            throw new ProductValidationException($"{label} must be greater than 0 and at most {MaxCm:0} cm.");

        return rounded;
    }

    /// <summary>One validated entry per size id (the last entry for a size wins); invalid numbers throw ProductValidationException.</summary>
    public static Dictionary<int, SizeMeasurementInput> Validate(IEnumerable<SizeMeasurementInput>? items)
    {
        var result = new Dictionary<int, SizeMeasurementInput>();
        foreach (var item in items ?? [])
        {
            if (item.SizeId <= 0)
                continue;

            result[item.SizeId] = new SizeMeasurementInput
            {
                SizeId = item.SizeId,
                WidthCm = NormalizeCm(item.WidthCm, "Width"),
                HeightCm = NormalizeCm(item.HeightCm, "Height"),
                DepthCm = NormalizeCm(item.DepthCm, "Depth"),
                HandleCm = NormalizeCm(item.HandleCm, "Handle"),
            };
        }

        return result;
    }
}
