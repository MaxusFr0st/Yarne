using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YarneAPIBack.Data;

/// <summary>
/// The shop texts the owner approved on 16 October 2026 (English that had fallen out of step with the
/// Ukrainian, a few typos, and the first English labels for the Editorial Picks tiles), written into the
/// saved storefront settings at start. A field changes only while it still holds the old text (or, for a
/// new field, while it is still missing), so it runs safely on every start and never overwrites anything
/// the owner has typed since. Values are constants in this file; nothing from a request reaches it.
/// </summary>
public static class StorefrontTextFixes
{
    /// <summary>A setting key, a dot path inside its JSON (numbers index arrays), the text expected there now (null: missing) and the approved one.</summary>
    public sealed record Fix(string Key, string Path, string? Old, string New);

    public static readonly Fix[] Fixes =
    [
        new("yarne.home.copy.v1", "en.editorial.titleLine2", "a longer story", "our story"),
        new("yarne.home.copy.v1", "en.editorial.paragraph1", "We source our yarns from family mills in the Scottish Highlands, the Peruvian altiplano, and the foothills of the Italian Alps. Each fibre is selected for its provenance, its handle, and its longevity.", "For us, a bag is more than a practical thing. It is the finishing touch of a look: the detail that catches the eye without a word and stays right whatever the season."),
        new("yarne.home.copy.v1", "en.editorial.paragraph2", "A Yarné piece is not designed for one season. It is designed to be worn, reworn, and passed on — a small act of resistance against disposable fashion.", "Every YARNÉ bag starts with a careful choice of yarn and ends as a piece where every detail has its purpose. We choose quality over compromise, because the true value of an accessory lies not only in how it looks but in how it serves you over time."),
        new("yarne.home.copy.v1", "en.showcase.eyebrow", "Featured Showcase", "Our Picks"),
        new("yarne.home.copy.v1", "en.showcase.title", "Editorial Picks", ""),
        new("yarne.why.v1", "en.items.0.word", "Beach costume", "Diva"),
        new("yarne.why.v1", "en.items.1.factTitle", "100% cotton. Are easy to care for", "100% cotton. Easy to care for"),
        new("yarne.why.v1", "uk.items.1.factTitle", "100% - бавовна. Легкий догляд", "100% бавовна. Легкий догляд"),
        new("yarne.why.v1", "uk.items.2.word", "Femorra", "Femmora"),
        new("yarne.why.v1", "uk.items.2.factBody", "Жодних складських залишків — кожне замовлення в'яжеться під замовлення.", "Жодних складських залишків — кожен виріб в'яжемо під замовлення."),
        new("yarne.why.v1", "en.items.2.factBody", "No excess stock — each order is made to order.", "No excess stock: every piece is knitted to order."),
        new("yarne.why.v1", "uk.care.items.1.body", "Дбайливе прання вовни у нашій майстерні.", "Дбайливо випираємо виріб у нашій майстерні."),
        new("yarne.why.v1", "en.care.items.1.body", "Gentle wool washing in our own workshop.", "We wash it gently in our own workshop."),
        new("yarne.why.v1", "uk.care.items.2.title", "Повернення безкоштовне", "Повернення 14 днів"),
        new("yarne.why.v1", "uk.care.items.2.body", "Не підійшла — забираємо за наш кошт.", "Не підійшла? Поверніть протягом 14 днів."),
        new("yarne.why.v1", "en.care.items.2.title", "Free returns", "14-day returns"),
        new("yarne.why.v1", "en.care.items.2.body", "Not the right fit? We collect it at our cost.", "Not right for you? Send it back within 14 days."),
        new("yarne.featuredShowcase.v1", "slot3.uk.heading", "Ваша унікальність надихає нас сторювати!", "Ваша унікальність надихає нас створювати!"),
        new("yarne.featuredShowcase.v1", "slot1.eyebrow", "New Season", "Новий сезон"),
        new("yarne.featuredShowcase.v1", "slot1.eyebrowEn", null, "New Season"),
        new("yarne.featuredShowcase.v1", "slot1.ctaLabelEn", null, "View"),
        new("yarne.featuredShowcase.v1", "slot2.ctaLabelEn", null, "View"),
        new("yarne.staticPages.v1", "ourHistory.uk.paragraphs.0", "YARNE був заснований у 2025 році з однією простою ідеєю — створити в'язану сумку, яка не виглядатиме звично.", "YARNÉ був заснований у 2025 році з однією простою ідеєю — створити в'язану сумку, яка не виглядатиме звично."),
        new("yarne.staticPages.v1", "ourHistory.en.paragraphs.3", "For us, an accessorie is more than a functional object. It is the finishing accent of a look — the detail that draws attention without excess words and remains relevant regardless of season.", "For us, an accessory is more than a functional object. It is the finishing accent of a look — the detail that draws attention without excess words and remains relevant regardless of season."),
    ];

    private static readonly JsonSerializerOptions WriteOptions = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public static async Task ApplyAsync(YarneDbContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        var keys = Fixes.Select(f => f.Key).Distinct().ToList();
        var rows = await db.AppSettings.Where(s => keys.Contains(s.Key)).ToListAsync(cancellationToken);
        var applied = 0;
        foreach (var row in rows)
        {
            JsonNode? root;
            try
            {
                root = JsonNode.Parse(row.ValueJson);
            }
            catch (JsonException)
            {
                continue;
            }
            if (root is null) continue;

            var changed = 0;
            foreach (var fix in Fixes.Where(f => f.Key == row.Key))
                if (TryApply(root, fix)) changed++;
            if (changed == 0) continue;

            row.ValueJson = root.ToJsonString(WriteOptions);
            row.UpdatedAt = DateTime.UtcNow;
            applied += changed;
        }

        if (applied == 0) return;
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Storefront texts: {Count} approved text fixes written.", applied);
    }

    /// <summary>Sets the field when it still holds <see cref="Fix.Old"/>; returns whether it changed.</summary>
    public static bool TryApply(JsonNode root, Fix fix)
    {
        var segments = fix.Path.Split('.');
        JsonNode? parent = root;
        foreach (var segment in segments[..^1])
        {
            parent = parent switch
            {
                JsonObject obj => obj[segment],
                JsonArray arr when int.TryParse(segment, out var i) && i >= 0 && i < arr.Count => arr[i],
                _ => null,
            };
            if (parent is null) return false;
        }

        var last = segments[^1];
        switch (parent)
        {
            case JsonObject obj:
            {
                var current = obj[last];
                if (!Matches(current, fix.Old)) return false;
                obj[last] = fix.New;
                return true;
            }
            case JsonArray arr when int.TryParse(last, out var i) && i >= 0 && i < arr.Count:
            {
                if (fix.Old is null || !Matches(arr[i], fix.Old)) return false;
                arr[i] = fix.New;
                return true;
            }
            default:
                return false;
        }
    }

    private static bool Matches(JsonNode? current, string? expected) =>
        expected is null
            ? current is null
            : current is JsonValue value && value.TryGetValue<string>(out var text) && text == expected;
}
