namespace YarneAPIBack.Services;

/// <summary>The countries Nova Post delivers to that the shop offers, and the rules for delivery abroad. Mirrored in YarneFront/src/app/utils/deliveryCountries.ts.</summary>
public static class ForeignDelivery
{
    public sealed record Country(string Code, string NameUk, string NameEn, string DialCode);

    public static readonly IReadOnlyList<Country> NovaPostCountries =
    [
        new("PL", "Польща", "Poland", "+48"),
        new("DE", "Німеччина", "Germany", "+49"),
        new("CZ", "Чехія", "Czechia", "+420"),
        new("LT", "Литва", "Lithuania", "+370"),
        new("LV", "Латвія", "Latvia", "+371"),
        new("EE", "Естонія", "Estonia", "+372"),
        new("MD", "Молдова", "Moldova", "+373"),
        new("RO", "Румунія", "Romania", "+40"),
        new("SK", "Словаччина", "Slovakia", "+421"),
        new("HU", "Угорщина", "Hungary", "+36"),
        new("IT", "Італія", "Italy", "+39"),
        new("ES", "Іспанія", "Spain", "+34"),
        new("FR", "Франція", "France", "+33"),
        new("GB", "Велика Британія", "United Kingdom", "+44"),
        new("AT", "Австрія", "Austria", "+43"),
        new("NL", "Нідерланди", "Netherlands", "+31"),
    ];

    public const string CarrierNovaPost = "NovaPost";
    public const string CarrierOther = "Other";

    private static readonly string[] BlockedNameParts =
    [
        "russia", "rossiya", "rossija", "russian federation", "росі", "россия", "российская", "рф",
        "belarus", "byelorussia", "білорус", "беларус", "белорус", "belaruś",
    ];

    /// <summary>Russia and Belarus are never delivered to: not by code, and not typed into "Other country" in any spelling.</summary>
    public static bool IsBlocked(string? code, string? name)
    {
        var c = code?.Trim().ToUpperInvariant();
        if (c is "RU" or "BY")
            return true;

        var n = (name ?? string.Empty).Trim().ToLowerInvariant();
        return n.Length > 0 && BlockedNameParts.Any(part => part == "рф" ? n == part : n.Contains(part));
    }

    /// <summary>
    /// The euro total (in cents) of a foreign order, from the € unit prices snapshotted on its lines. An error when any line has no
    /// € price: such an order cannot be paid in euro.
    /// </summary>
    public static (string? Error, long Cents) EurTotalCents(IEnumerable<YarneAPIBack.Models.OrderItem> items)
    {
        long total = 0;
        foreach (var item in items)
        {
            if (!item.EurUnitPrice.HasValue || item.EurUnitPrice.Value <= 0)
                return ("One of the items has no euro price yet, so it cannot be ordered for delivery abroad. Please write to us.", 0);
            total = checked(total + (long)decimal.Round(item.EurUnitPrice.Value * 100m, 0, MidpointRounding.AwayFromZero) * item.Quantity);
        }

        return (null, total);
    }

    /// <summary>
    /// An order delivered abroad has one way of paying (the bank transfer), so there is nothing to choose: once it is accepted
    /// its choice is set to Transfer on its own (no email to anyone). Returns whether it changed the order.
    /// </summary>
    public static bool ApplyAutoTransfer(YarneAPIBack.Models.Order order)
    {
        if (!order.IsForeignDelivery || order.PaymentChoice != null)
            return false;
        if (order.Status is not ("Accepted" or "InProduction" or "Made"))
            return false;

        order.PaymentChoice = "Transfer";
        order.PaymentChoiceAt = DateTime.UtcNow;
        return true;
    }

    public static Country? Find(string? code) =>
        NovaPostCountries.FirstOrDefault(c => string.Equals(c.Code, code?.Trim(), StringComparison.OrdinalIgnoreCase));

    /// <summary>Checks a foreign order's destination. Returns the cleaned country code, name and carrier, or an error message.</summary>
    public static (string? Error, string Code, string Name, string Carrier) Validate(
        string? countryCode, string? countryName, string? carrier, string? branchId, string? city, string? address)
    {
        var code = countryCode?.Trim().ToUpperInvariant() ?? string.Empty;
        var name = countryName?.Trim() ?? string.Empty;
        if (IsBlocked(code, name))
            return ("We cannot deliver to this country.", code, name, string.Empty);

        var known = Find(code);
        if (known != null)
            name = known.NameEn;
        else if (name.Length == 0)
            return ("Country is required.", code, name, string.Empty);

        if (string.IsNullOrWhiteSpace(city))
            return ("City is required.", code, name, string.Empty);

        var kind = string.Equals(carrier?.Trim(), CarrierNovaPost, StringComparison.OrdinalIgnoreCase) ? CarrierNovaPost : CarrierOther;
        if (kind == CarrierNovaPost && (known == null || string.IsNullOrWhiteSpace(branchId)))
            return ("A Nova Post branch needs a listed country and a branch.", code, name, kind);
        if (kind == CarrierOther && string.IsNullOrWhiteSpace(address))
            return ("A delivery address is required.", code, name, kind);

        return (null, known != null ? known.Code : code, name, kind);
    }
}
