using System.Text.Json.Nodes;
using YarneAPIBack.Data;
using YarneAPIBack.Services;

namespace YarneAPIBack.Tests;

public class StorefrontPageSeedsTests
{
    private static JsonNode SavedDelivery() =>
        JsonNode.Parse("""
            {"version":1,"sections":[
              {"heading":{"uk":"a","en":"a"},"body":{"uk":"","en":""}},
              {"heading":{"uk":"b","en":"b"},"body":{"uk":"","en":""}},
              {"heading":{"uk":"c","en":"c"},"body":{"uk":"","en":""}},
              {"heading":{"uk":"d","en":"d"},"body":{"uk":"","en":""}},
              {"heading":{"uk":"e","en":"e"},"body":{"uk":"","en":""}}]}
            """)!;

    [Fact]
    public void Every_delivery_addition_lands_on_the_saved_page()
    {
        var root = SavedDelivery();

        foreach (var addition in StorefrontPageSeeds.Additions)
            Assert.True(StorefrontPageSeeds.TryAdd(root, addition), addition.Path);

        Assert.Equal(4, root["glance"]!.AsArray().Count);
        Assert.Equal("returns", root["sections"]![3]!["icon"]!.GetValue<string>());
        Assert.Equal(4, root["sections"]![3]!["steps"]!.AsArray().Count);
    }

    [Fact]
    public void An_addition_never_replaces_what_the_owner_already_has()
    {
        var root = SavedDelivery();
        root["intro"] = JsonNode.Parse("""{"uk":"мій","en":"mine"}""");
        root["sections"]![0]!["icon"] = "payment";

        foreach (var addition in StorefrontPageSeeds.Additions)
            StorefrontPageSeeds.TryAdd(root, addition);

        Assert.Equal("mine", root["intro"]!["en"]!.GetValue<string>());
        Assert.Equal("payment", root["sections"]![0]!["icon"]!.GetValue<string>());
    }

    [Fact]
    public void The_terms_page_is_valid_json_with_eight_sections_in_both_languages()
    {
        var terms = JsonNode.Parse(StorefrontPageSeeds.TermsJson)!;
        var sections = terms["sections"]!.AsArray();

        Assert.Equal(8, sections.Count);
        Assert.All(sections, s =>
        {
            Assert.False(string.IsNullOrWhiteSpace(s!["heading"]!["uk"]!.GetValue<string>()));
            Assert.False(string.IsNullOrWhiteSpace(s!["body"]!["en"]!.GetValue<string>()));
        });
        Assert.Contains(StorefrontPageSeeds.TermsKey, StorefrontSettingsService.AllowedKeys);
    }
}
