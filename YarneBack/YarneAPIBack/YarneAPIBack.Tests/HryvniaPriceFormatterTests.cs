using YarneAPIBack.Services;

namespace YarneAPIBack.Tests;

public class HryvniaPriceFormatterTests
{
    [Theory]
    [InlineData(1, "гривня")]
    [InlineData(2, "гривні")]
    [InlineData(4, "гривні")]
    [InlineData(5, "гривень")]
    [InlineData(11, "гривень")]
    [InlineData(21, "гривня")]
    [InlineData(22, "гривні")]
    [InlineData(99.5, "гривень")]
    public void GetUnit_UsesUkrainianDeclension(decimal amount, string expectedUnit)
    {
        Assert.Equal(expectedUnit, HryvniaPriceFormatter.GetUnit(amount));
    }

    [Fact]
    public void Format_IncludesOfficialHryvniaSign()
    {
        var formatted = HryvniaPriceFormatter.Format(100m);

        Assert.StartsWith(HryvniaPriceFormatter.Sign, formatted);
        Assert.Contains("100,00 гривень", formatted);
    }
}
