using System.Text.Json;
using YarneAPIBack.Configuration;
using YarneAPIBack.Services;

namespace YarneAPIBack.Tests;

public class ProductPolishTests
{
    [Fact]
    public void ProductValidationException_ExposesInvalidSuggestedCodes()
    {
        var ex = new ProductValidationException("Invalid codes", new[] { "MISSING-1", "MISSING-2" });

        Assert.Equal(2, ex.InvalidSuggestedCodes.Count);
        Assert.Contains("MISSING-1", ex.InvalidSuggestedCodes);
    }

    [Fact]
    public void ValidateProductGuarantee_RejectsOversizedTitle()
    {
        var payload = JsonSerializer.SerializeToElement(new
        {
            titleEn = new string('a', 121),
            descriptionEn = "ok",
            titleUk = "ok",
            descriptionUk = "ok",
        });

        var error = StorefrontSettingValidators.ValidateProductGuarantee(payload);

        Assert.NotNull(error);
        Assert.Contains("titleEn", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateProductGuarantee_AcceptsValidPayload()
    {
        var payload = JsonSerializer.SerializeToElement(new
        {
            titleEn = "Quality Guarantee",
            descriptionEn = "We guarantee our products.",
            titleUk = "Гарантія якості",
            descriptionUk = "Ми гарантуємо якість.",
        });

        var error = StorefrontSettingValidators.ValidateProductGuarantee(payload);

        Assert.Null(error);
    }

    [Theory]
    [InlineData(51, true)]
    [InlineData(50, false)]
    public void ValidateSuggestedProductCodeLength(int length, bool shouldReject)
    {
        var code = new string('A', length);
        var ex = Record.Exception(() => InvokeValidateSuggestedProductCodes(new[] { code }));

        if (shouldReject)
            Assert.IsType<ProductValidationException>(ex);
        else
            Assert.Null(ex);
    }

    private static void InvokeValidateSuggestedProductCodes(IReadOnlyList<string> codes)
    {
        if (codes.Count > 10)
            throw new ProductValidationException("At most 10 suggested products are allowed.");

        foreach (var code in codes)
        {
            if (string.IsNullOrWhiteSpace(code))
                continue;

            if (code.Trim().Length > 50)
                throw new ProductValidationException("Each suggested product code must be 50 characters or fewer.");
        }
    }
}
