using System.Text;

namespace YarneAPIBack.Data;

/// <summary>
/// The approved English product texts, written once by the migration that adds the columns. Every UPDATE only
/// fills a field that is still NULL, so it never overwrites anything the owner typed. Values are constants in
/// this file, turned into SQL string literals with single quotes doubled; nothing from a request reaches it.
/// </summary>
public static class ProductEnglishSeed
{
    private const string BeachSetDescription =
        "The set comes in one universal size. The stretchy knit adapts to the figure and gives a comfortable fit.\n"
        + "Care: if needed, hand wash in cool water (up to 30°C) with a mild liquid detergent for delicate fabrics. "
        + "Do not rub hard; squeeze gently. Blot excess water with a towel. "
        + "Dry flat on a horizontal surface, shaping the piece back to its original form.";

    private const string DelicateCare =
        "Care: wash by hand or in a machine on a delicate cycle at up to 30°C. "
        + "Use a mild liquid detergent for delicate fabrics. Then blot with a towel and dry flat.";

    internal static readonly (string Code, string Name, string? Material, string Description)[] Products =
    [
        ("YRN-539393", "Charlotte", null,
            "A soft handmade cosmetic bag with a chunky knit and a gentle, fluffy texture. Charlotte is made for your favourite make-up and the small things you like to keep close.\n\n"
            + "Inside: a practical cotton lining and a zip. Its compact size makes it easy to carry in a bag, take on a trip or leave on the dressing table."),
        ("YRN-1111", "Chérie", "Knitted yarn (100% cotton)",
            "The most versatile piece in our collection; a strap can be bought separately. A great choice for every day.\n" + DelicateCare),
        ("YRN-360670", "Diva", "Knitted yarn (100% cotton)",
            "Ideal for study and work. Roomy, comfortable and stylish.\n" + DelicateCare),
        ("YRN-1011", "Femmora", "Knitted yarn (100% cotton)",
            "An elegant, classic evening clutch to complete your looks. It holds the small essentials.\n"
            + "Care: hand wash only, because of the metal clasp frame that is part of the clutch. Then blot thoroughly with a towel and leave to dry."),
        ("YRN-186738", "Lira", null,
            "Create your ideal summer look with a bag that goes with literally everything.\nCare: spot clean by hand only, when needed."),
        ("YRN-064202", "Miren", "Premium raffia (Ispie)",
            "Material: high-quality Ispie raffia (100% viscose)\nTechnique: hand crochet\nType: clutch\nShape: soft structured\nHardware: metal\nCare: spot clean by hand only, when needed."),
        ("YRN-872988", "Hat", null,
            "A beautiful hat in high-quality, straw-coloured raffia."),
        ("YRN-461727", "Beach set with skirt", "Summer yarn (50% cotton, 50% polyester)", BeachSetDescription),
        ("YRN-456315", "Beach set with shorts", null, BeachSetDescription),
    ];

    /// <summary>Category name (Ukrainian, as stored) to its English name.</summary>
    internal static readonly (string Name, string NameEn)[] Categories =
    [
        ("Сумки", "Bags"),
        ("Клатчі", "Clutches"),
        ("Шляпи", "Hats"),
        ("Костюми", "Sets"),
    ];

    public static string Literal(string value) => "'" + value.Replace("'", "''") + "'";

    public static string BuildSql()
    {
        var sql = new StringBuilder();
        foreach (var (code, name, material, description) in Products)
        {
            AppendProductUpdate(sql, code, "NameEn", name);
            AppendProductUpdate(sql, code, "DescriptionEn", description);
            if (material != null)
                AppendProductUpdate(sql, code, "MaterialEn", material);
        }

        foreach (var (name, nameEn) in Categories)
            sql.Append($"UPDATE \"Category\" SET \"NameEn\" = {Literal(nameEn)} WHERE \"Name\" = {Literal(name)} AND \"NameEn\" IS NULL;\n");

        return sql.ToString();
    }

    private static void AppendProductUpdate(StringBuilder sql, string code, string column, string value) =>
        sql.Append($"UPDATE \"Product\" SET \"{column}\" = {Literal(value)} WHERE \"ProductCode\" = {Literal(code)} AND \"{column}\" IS NULL;\n");
}
