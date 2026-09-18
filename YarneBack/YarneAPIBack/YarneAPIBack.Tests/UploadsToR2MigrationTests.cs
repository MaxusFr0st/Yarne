using YarneAPIBack.Services;

namespace YarneAPIBack.Tests;

public class UploadsToR2MigrationTests
{
    private static Dictionary<string, string> Map() => new(StringComparer.OrdinalIgnoreCase)
    {
        ["/uploads/hero.webp"] = "https://media.yarne-acc.com/hero.webp",
    };

    [Fact]
    public void RewriteJson_ReplacesBareUploadPath()
    {
        var json = """{"heroImageUrl":"/uploads/hero.webp"}""";

        var result = UploadsToR2Migration.RewriteJson(json, Map());

        Assert.Equal("""{"heroImageUrl":"https://media.yarne-acc.com/hero.webp"}""", result);
    }

    [Fact]
    public void RewriteJson_ReplacesWholeAbsoluteUrl_NotJustThePathPortion()
    {
        // A settings blob written before URLs were normalized holds the full API address.
        // Swapping only the "/uploads/hero.webp" segment would splice the R2 URL into the
        // middle of the old one and produce an unloadable address.
        var json = """{"heroImageUrl":"https://api.yarne-acc.com/uploads/hero.webp"}""";

        var result = UploadsToR2Migration.RewriteJson(json, Map());

        Assert.Equal("""{"heroImageUrl":"https://media.yarne-acc.com/hero.webp"}""", result);
    }

    [Fact]
    public void RewriteJson_LeavesUnmappedUploadsUntouched()
    {
        var json = """{"heroImageUrl":"/uploads/missing.webp"}""";

        var result = UploadsToR2Migration.RewriteJson(json, Map());

        Assert.Equal(json, result);
    }

    [Fact]
    public void RewriteJson_LeavesAlreadyMigratedR2UrlsUntouched()
    {
        var json = """{"heroImageUrl":"https://media.yarne-acc.com/hero.webp"}""";

        var result = UploadsToR2Migration.RewriteJson(json, Map());

        Assert.Equal(json, result);
    }

    [Fact]
    public void RewriteJson_ReplacesEveryOccurrence()
    {
        var json = """{"a":"/uploads/hero.webp","b":"/uploads/hero.webp"}""";

        var result = UploadsToR2Migration.RewriteJson(json, Map());

        Assert.Equal(
            """{"a":"https://media.yarne-acc.com/hero.webp","b":"https://media.yarne-acc.com/hero.webp"}""",
            result);
    }

    [Fact]
    public void RewriteJson_HandlesNullAndEmpty()
    {
        Assert.Equal(string.Empty, UploadsToR2Migration.RewriteJson(null, Map()));
        Assert.Equal(string.Empty, UploadsToR2Migration.RewriteJson("", Map()));
    }
}
