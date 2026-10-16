using System.Text.Json.Nodes;
using YarneAPIBack.Data;

namespace YarneAPIBack.Tests;

public class StorefrontTextFixesTests
{
    private static StorefrontTextFixes.Fix Fix(string path, string? old, string @new) => new("yarne.why.v1", path, old, @new);

    [Fact]
    public void Replaces_a_text_that_still_holds_the_old_wording()
    {
        var root = JsonNode.Parse("""{"en":{"care":{"items":[{"body":"a"},{"body":"Gentle wool washing."}]}}}""")!;

        Assert.True(StorefrontTextFixes.TryApply(root, Fix("en.care.items.1.body", "Gentle wool washing.", "We wash it gently.")));
        Assert.Equal("We wash it gently.", root["en"]!["care"]!["items"]![1]!["body"]!.GetValue<string>());
    }

    [Fact]
    public void Leaves_a_text_the_owner_has_changed_since()
    {
        var root = JsonNode.Parse("""{"en":{"title":"Owner's own words"}}""")!;

        Assert.False(StorefrontTextFixes.TryApply(root, Fix("en.title", "Old words", "New words")));
        Assert.Equal("Owner's own words", root["en"]!["title"]!.GetValue<string>());
    }

    [Fact]
    public void Adds_a_new_field_only_while_it_is_missing()
    {
        var root = JsonNode.Parse("""{"slot1":{"ctaLabel":"Переглянути"},"slot2":{"ctaLabelEn":"Shop"}}""")!;

        Assert.True(StorefrontTextFixes.TryApply(root, Fix("slot1.ctaLabelEn", null, "View")));
        Assert.False(StorefrontTextFixes.TryApply(root, Fix("slot2.ctaLabelEn", null, "View")));
        Assert.Equal("View", root["slot1"]!["ctaLabelEn"]!.GetValue<string>());
        Assert.Equal("Shop", root["slot2"]!["ctaLabelEn"]!.GetValue<string>());
    }

    [Fact]
    public void Replaces_an_array_item_and_ignores_paths_that_do_not_exist()
    {
        var root = JsonNode.Parse("""{"ourHistory":{"uk":{"paragraphs":["YARNE був","два"]}}}""")!;

        Assert.True(StorefrontTextFixes.TryApply(root, Fix("ourHistory.uk.paragraphs.0", "YARNE був", "YARNÉ був")));
        Assert.False(StorefrontTextFixes.TryApply(root, Fix("ourHistory.uk.paragraphs.5", "x", "y")));
        Assert.False(StorefrontTextFixes.TryApply(root, Fix("missing.path.here", "x", "y")));
        Assert.Equal("YARNÉ був", root["ourHistory"]!["uk"]!["paragraphs"]![0]!.GetValue<string>());
    }

    [Fact]
    public void Every_approved_fix_targets_a_shop_setting_and_changes_its_text()
    {
        foreach (var fix in StorefrontTextFixes.Fixes)
        {
            Assert.NotEqual(fix.Old, fix.New);
            Assert.True(StorefrontSettingsServiceKeys.Contains(fix.Key), fix.Key);
        }
    }

    private static readonly IReadOnlySet<string> StorefrontSettingsServiceKeys = YarneAPIBack.Services.StorefrontSettingsService.AllowedKeys;
}
