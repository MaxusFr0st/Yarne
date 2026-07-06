using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using YarneAPIBack.Services;

namespace YarneAPIBack.Tests;

public class SmtpEmailServiceTests
{
    [Fact]
    public async Task SendOrderConfirmationAsync_SkipsWhenSmtpNotConfigured()
    {
        var configuration = new ConfigurationBuilder().Build();
        var service = new SmtpEmailService(configuration, NullLogger<SmtpEmailService>.Instance);
        var message = new OrderConfirmationEmailMessage
        {
            OrderId = 1,
            ToEmail = "customer@example.com",
            CustomerName = "Test User",
        };

        var exception = await Record.ExceptionAsync(() => service.SendOrderConfirmationAsync(message));

        Assert.Null(exception);
    }

    [Fact]
    public async Task SendOrderConfirmationAsync_SkipsWhenRecipientEmpty()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SMTP_HOST"] = "smtp.example.com",
                ["SMTP_USER"] = "user",
                ["SMTP_PASSWORD"] = "pass",
                ["EMAIL_FROM"] = "orders@yarne.com",
            })
            .Build();
        var service = new SmtpEmailService(configuration, NullLogger<SmtpEmailService>.Instance);
        var message = new OrderConfirmationEmailMessage { OrderId = 1, ToEmail = "   " };

        var exception = await Record.ExceptionAsync(() => service.SendOrderConfirmationAsync(message));

        Assert.Null(exception);
    }
}
