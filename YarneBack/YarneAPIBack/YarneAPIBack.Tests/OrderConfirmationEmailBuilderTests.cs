using YarneAPIBack.Services;

namespace YarneAPIBack.Tests;

public class OrderConfirmationEmailBuilderTests
{
    [Fact]
    public void BuildSubject_IncludesOrderId()
    {
        var message = SampleMessage(orderId: 42);

        var subject = OrderConfirmationEmailBuilder.BuildSubject(message);

        Assert.Equal("Підтвердження замовлення №42", subject);
    }

    [Fact]
    public void BuildHtml_EncodesCustomerName_AgainstXss()
    {
        var message = SampleMessage(customerName: "<script>alert(1)</script>");

        var html = OrderConfirmationEmailBuilder.BuildHtml(message);

        Assert.DoesNotContain("<script>", html);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", html);
    }

    [Fact]
    public void BuildHtml_EncodesProductFields()
    {
        var message = SampleMessage();
        message.Items =
        [
            new OrderConfirmationEmailItem
            {
                ProductCode = "A&B",
                ProductName = "\"Knit\" <test>",
                Quantity = 2,
                UnitPrice = 99.5m,
            },
        ];

        var html = OrderConfirmationEmailBuilder.BuildHtml(message);

        Assert.Contains("A&amp;B", html);
        Assert.Contains("&quot;Knit&quot; &lt;test&gt;", html);
        Assert.Contains("99,50 гривень", html);
        Assert.Contains(HryvniaPriceFormatter.Sign, html);
        Assert.Contains("199,00 гривень", html);
    }

    [Fact]
    public void BuildHtml_IncludesOrderMetadata()
    {
        var message = SampleMessage(orderId: 7, total: 250m);

        var html = OrderConfirmationEmailBuilder.BuildHtml(message);

        Assert.Contains("#7", html);
        Assert.Contains("250,00 гривень", html);
        Assert.Contains(HryvniaPriceFormatter.Sign, html);
        Assert.Contains("lang=\"uk\"", html);
    }

    private static OrderConfirmationEmailMessage SampleMessage(
        int orderId = 1,
        string customerName = "Олена Коваленко",
        decimal total = 100m)
        => new()
        {
            OrderId = orderId,
            CustomerName = customerName,
            ToEmail = "test@example.com",
            OrderDateUtc = new DateTime(2026, 7, 5, 12, 30, 0, DateTimeKind.Utc),
            Total = total,
            Items =
            [
                new OrderConfirmationEmailItem
                {
                    ProductCode = "YRN-01",
                    ProductName = "Merino Sweater",
                    Quantity = 1,
                    UnitPrice = 100m,
                },
            ],
        };
}
