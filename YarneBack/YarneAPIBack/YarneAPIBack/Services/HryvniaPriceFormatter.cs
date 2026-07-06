using System.Globalization;

namespace YarneAPIBack.Services;

public static class HryvniaPriceFormatter
{
    /// <summary>Official Ukrainian hryvnia sign (Unicode U+20B4), adopted by NBU in 2004.</summary>
    public const string Sign = "\u20B4";

    private static readonly CultureInfo UkrainianCulture = CultureInfo.GetCultureInfo("uk-UA");

    public static string Format(decimal price)
    {
        var amount = price.ToString("N2", UkrainianCulture);
        var unit = GetUnit(price);
        return $"{Sign}\u00a0{amount} {unit}";
    }

    public static string GetUnit(decimal price)
    {
        var wholeUnits = (int)Math.Floor(Math.Abs(price));
        var mod100 = wholeUnits % 100;
        var mod10 = wholeUnits % 10;

        if (mod100 is >= 11 and <= 14)
            return "гривень";

        return mod10 switch
        {
            1 => "гривня",
            2 or 3 or 4 => "гривні",
            _ => "гривень",
        };
    }
}
