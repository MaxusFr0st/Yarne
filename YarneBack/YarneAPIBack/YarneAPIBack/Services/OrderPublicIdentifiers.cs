using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;

namespace YarneAPIBack.Services;

/// <summary>
/// The two public handles an order has besides its sequential Id: the six-digit number the customer
/// quotes ("№ 482135") and the unguessable token in the status-page link. Neither can be derived from the Id.
/// </summary>
public static class OrderPublicIdentifiers
{
    private const int TokenBytes = 32;
    private const int MaxNumberAttempts = 50;

    /// <summary>32 bytes from the operating system's cryptographic RNG, URL-safe base64 (43 characters).</summary>
    public static string NewStatusToken() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(TokenBytes));

    /// <summary>Whether the text can be a token this class made: the right length and only URL-safe characters.</summary>
    public static bool LooksLikeStatusToken(string? value) =>
        value is { Length: >= 40 and <= 64 } && value.All(c => char.IsAsciiLetterOrDigit(c) || c == '-' || c == '_');

    private static readonly Lazy<TimeZoneInfo> Kyiv = new(() =>
    {
        foreach (var id in new[] { "Europe/Kyiv", "Europe/Kiev", "FLE Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch (TimeZoneNotFoundException) { }
        }

        return TimeZoneInfo.Utc;
    });

    /// <summary>"Y" + DDMMYY for the day an order was placed, in Kyiv time: the start of its number.</summary>
    public static string DayPrefix(DateTime orderDate)
    {
        var utc = orderDate.Kind == DateTimeKind.Local ? orderDate.ToUniversalTime() : DateTime.SpecifyKind(orderDate, DateTimeKind.Utc);
        return "Y" + TimeZoneInfo.ConvertTimeFromUtc(utc, Kyiv.Value).ToString("ddMMyy", System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>The count after the dash of "Y071026-3", or 0 when the text is not a number of this day.</summary>
    public static int CountOf(string? number, string dayPrefix)
        => number != null && number.StartsWith(dayPrefix + "-", StringComparison.Ordinal)
            && int.TryParse(number.AsSpan(dayPrefix.Length + 1), out var n) ? n : 0;

    /// <summary>The next free number for the day of <paramref name="orderDate"/>: that day's highest count plus one, starting at 1.</summary>
    public static async Task<string> NewOrderNumberAsync(YarneDbContext db, DateTime orderDate, CancellationToken ct = default)
    {
        var prefix = DayPrefix(orderDate);
        var taken = await db.Orders
            .Where(o => o.OrderNumber != null && o.OrderNumber.StartsWith(prefix + "-"))
            .Select(o => o.OrderNumber)
            .ToListAsync(ct);
        var next = taken.Select(n => CountOf(n, prefix)).DefaultIfEmpty(0).Max() + 1;
        return $"{prefix}-{next}";
    }

    public static Task<bool> IsNumberTakenAsync(YarneDbContext db, string? number, CancellationToken ct = default)
        => number == null ? Task.FromResult(false) : db.Orders.AsNoTracking().AnyAsync(o => o.OrderNumber == number, ct);

    public static string FormatOrderNumber(string? number) => number ?? string.Empty;
}
