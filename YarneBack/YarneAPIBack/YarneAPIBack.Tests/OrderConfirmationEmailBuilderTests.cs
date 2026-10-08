using YarneAPIBack.Services;

namespace YarneAPIBack.Tests;

public class OrderConfirmationEmailBuilderTests
{
    [Fact]
    public void BuildSubject_IncludesOrderId()
    {
        var message = SampleMessage(orderId: 42);

        var subject = OrderConfirmationEmailBuilder.BuildSubject(message);

        Assert.Equal("Yarné · Замовлення #42", subject);
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

        Assert.Contains("&quot;Knit&quot; &lt;test&gt;", html);
        Assert.Contains("99,50 гривень", html);
        Assert.Contains("× 2", html);
        Assert.Contains(HryvniaPriceFormatter.Sign, html);

        // The owner's internal notice still carries the code and the line total.
        message.Event = OrderEmailEvent.InternalPlacedNotification;
        var internalHtml = OrderConfirmationEmailBuilder.BuildHtml(message);
        Assert.Contains("A&amp;B", internalHtml);
        Assert.Contains("199,00 гривень", internalHtml);
    }

    [Fact]
    public void BuildHtml_ShowsColorSizeStrapAndHardwareColor()
    {
        var message = SampleMessage();
        message.Items =
        [
            new OrderConfirmationEmailItem
            {
                ProductCode = "YRN-1",
                ProductName = "Chérie",
                ColorName = "Brownie",
                SizeName = "One Size",
                WithLace = true,
                FurnitureColorName = "Gold",
                Quantity = 1,
                UnitPrice = 1500m,
            },
        ];

        var html = OrderConfirmationEmailBuilder.BuildHtml(message);

        Assert.Contains("фурнітура: Gold", html);
        Assert.Contains("Brownie", html);
        Assert.Contains("One Size", html);
        Assert.Contains("Gold", html);
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

    [Fact]
    public void BuildSubject_UsesThePublicOrderNumber_NotTheId()
    {
        var message = SampleMessage(orderId: 42);
        message.OrderNumber = "Y071026-3";

        foreach (var (emailEvent, _) in new[]
                 {
                     (OrderEmailEvent.Received, "отримано"),
                     (OrderEmailEvent.Confirmed, "прийнято"),
                     (OrderEmailEvent.Shipped, "відправлено"),
                     (OrderEmailEvent.Canceled, "скасовано"),
                 })
        {
            message.Event = emailEvent;
            Assert.Equal("Yarné · Замовлення Y071026-3", OrderConfirmationEmailBuilder.BuildSubject(message));
        }

        message.Event = OrderEmailEvent.InternalPlacedNotification;
        Assert.Equal("[Адмін] Замовлення Y071026-3", OrderConfirmationEmailBuilder.BuildSubject(message));
        Assert.DoesNotContain("#42", OrderConfirmationEmailBuilder.BuildHtml(message));
    }

    [Fact]
    public void CustomerEmail_ShowsTheNumberUpTop_AndEachItemAsABlockNotATable()
    {
        var message = SampleMessage();
        message.OrderNumber = "Y071026-3";
        message.StatusUrl = "https://yarne-acc.com/uk/order/abc";
        message.Items =
        [
            new OrderConfirmationEmailItem
            {
                ProductCode = "YRN-1111",
                ProductName = "Cherie",
                ProductImageUrl = "https://media.example/p.webp",
                ColorName = "Pink",
                ColorNameUk = "Рожевий",
                SizeName = "One Size",
                WithLace = true,
                FurnitureColorName = "Gold",
                FurnitureColorNameUk = "золото",
                Quantity = 2,
                UnitPrice = 1150m,
            },
        ];

        var html = OrderConfirmationEmailBuilder.BuildHtml(message);

        Assert.True(html.IndexOf("Y071026-3", StringComparison.Ordinal) < html.IndexOf("Cherie", StringComparison.Ordinal));
        Assert.Contains(System.Net.WebUtility.HtmlEncode("Рожевий · One Size · з ремінцем · фурнітура: золото"), html);
        Assert.Contains("× 2", html);
        Assert.Contains("https://media.example/p.webp", html);
        Assert.DoesNotContain("<thead>", html);
        Assert.Contains("#F5F2ED", html);
        Assert.Contains("#2D241E", html);
        Assert.Contains("#4A0E0E", html);
        Assert.Contains("Georgia", html);
    }

    [Fact]
    public void DetailsLine_NamesStrapAndLeavesOutWhatIsNotThere()
    {
        Assert.Equal("Pink · One Size · без ремінця", OrderConfirmationEmailBuilder.BuildDetailsLine(
            new OrderConfirmationEmailItem { ColorName = "Pink", SizeName = "One Size", WithLace = false }));
        Assert.Equal("Slonova", OrderConfirmationEmailBuilder.BuildDetailsLine(
            new OrderConfirmationEmailItem { ColorName = "Slonova" }));
    }

    [Fact]
    public void ReceivedEmail_HasOneStatusButton()
    {
        var message = SampleMessage();
        message.Event = OrderEmailEvent.Received;
        message.StatusUrl = "https://yarne-acc.com/uk/order/abc";

        var html = OrderConfirmationEmailBuilder.BuildHtml(message);

        Assert.Contains("href=\"https://yarne-acc.com/uk/order/abc\"", html);
        Assert.Contains("Статус замовлення", html);
        Assert.DoesNotContain("pay=transfer", html);
    }

    [Fact]
    public void AcceptedEmail_AsksHowToPay_WithTwoButtonsAndTheFeeNote()
    {
        var message = SampleMessage(total: 1150m);
        message.Event = OrderEmailEvent.Confirmed;
        message.StatusUrl = "https://yarne-acc.com/uk/order/abc";

        var html = OrderConfirmationEmailBuilder.BuildHtml(message);

        Assert.Contains("Оберіть, як вам зручніше оплатити", html);
        Assert.Contains("href=\"https://yarne-acc.com/uk/order/abc?pay=transfer\"", html);
        Assert.Contains("href=\"https://yarne-acc.com/uk/order/abc?pay=pickup\"", html);
        Assert.Contains("Переказ на картку", html);
        Assert.Contains("Оплата при отриманні", html);
        Assert.Contains("Нова пошта бере комісію за переказ коштів", html);
    }

    [Fact]
    public void ShippedEmail_ShowsTheTtn_AndCanceledEmail_TheReason()
    {
        var shipped = SampleMessage();
        shipped.Event = OrderEmailEvent.Shipped;
        shipped.TtnNumber = "20450000000000";
        shipped.StatusUrl = "https://yarne-acc.com/uk/order/abc";
        Assert.Contains("20450000000000", OrderConfirmationEmailBuilder.BuildHtml(shipped));

        var canceled = SampleMessage();
        canceled.Event = OrderEmailEvent.Canceled;
        canceled.CancelReason = "Немає пряжі <цього> кольору";
        var html = OrderConfirmationEmailBuilder.BuildHtml(canceled);
        Assert.Contains("Причина:", html);
        Assert.Contains("Немає пряжі &lt;цього&gt; кольору", html);

        canceled.CancelReason = null;
        Assert.DoesNotContain("Причина:", OrderConfirmationEmailBuilder.BuildHtml(canceled));
    }

    [Fact]
    public void InternalNotice_KeepsTheFullTable_AndShowsNumberPaymentChoiceAndStatusLink()
    {
        var message = SampleMessage();
        message.Event = OrderEmailEvent.InternalPlacedNotification;
        message.OrderNumber = "Y071026-3";
        message.StatusUrl = "https://yarne-acc.com/uk/order/abc";

        var html = OrderConfirmationEmailBuilder.BuildHtml(message);
        Assert.Contains("<thead>", html);
        Assert.Contains("Y071026-3", html);
        Assert.Contains("очікуємо вибір покупця", html);
        Assert.Contains("href=\"https://yarne-acc.com/uk/order/abc\"", html);

        message.PaymentChoice = "Pickup";
        Assert.Contains("Оплата при отриманні", OrderConfirmationEmailBuilder.BuildHtml(message));
    }

    [Fact]
    public void CustomerEmail_StillShowsEurOnlyForEnglishOrders()
    {
        var message = SampleMessage(total: 1000m);
        message.EurTotal = 25m;
        Assert.DoesNotContain("€", OrderConfirmationEmailBuilder.BuildHtml(message));

        message.Locale = "en";
        Assert.Contains("(€25.00)", OrderConfirmationEmailBuilder.BuildHtml(message));
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
