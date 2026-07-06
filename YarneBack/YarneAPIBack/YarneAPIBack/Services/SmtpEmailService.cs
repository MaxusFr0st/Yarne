using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class SmtpEmailService : IEmailService
{
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly string? _smtpHost;
    private readonly int _smtpPort;
    private readonly string? _smtpUser;
    private readonly string? _smtpPassword;
    private readonly string? _emailFrom;

    public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
    {
        _logger = logger;
        _smtpHost = configuration["SMTP_HOST"] ?? Environment.GetEnvironmentVariable("SMTP_HOST");
        _smtpUser = configuration["SMTP_USER"] ?? Environment.GetEnvironmentVariable("SMTP_USER");
        _smtpPassword = configuration["SMTP_PASSWORD"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD");
        _emailFrom = configuration["EMAIL_FROM"] ?? Environment.GetEnvironmentVariable("EMAIL_FROM");

        var configuredPort = configuration["SMTP_PORT"] ?? Environment.GetEnvironmentVariable("SMTP_PORT");
        _smtpPort = int.TryParse(configuredPort, out var parsedPort) ? parsedPort : 587;
    }

    public async Task SendOrderConfirmationAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default)
    {
        if (!CanSendEmails())
            return;

        if (string.IsNullOrWhiteSpace(message.ToEmail))
        {
            _logger.LogWarning("Skipping order confirmation email for order #{OrderId}: recipient email is empty.", message.OrderId);
            return;
        }

        var subject = OrderConfirmationEmailBuilder.BuildSubject(message);
        var htmlBody = OrderConfirmationEmailBuilder.BuildHtml(message);
        await SendHtmlEmailAsync(message.ToEmail, subject, htmlBody);
    }

    public Task SendOrderReceiptAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Order receipt email is not implemented yet. Placeholder invoked for order #{OrderId}.",
            message.OrderId);

        return Task.CompletedTask;
    }

    private bool CanSendEmails()
    {
        var missingValues = new List<string>();

        if (string.IsNullOrWhiteSpace(_smtpHost))
            missingValues.Add("SMTP_HOST");
        if (string.IsNullOrWhiteSpace(_smtpUser))
            missingValues.Add("SMTP_USER");
        if (string.IsNullOrWhiteSpace(_smtpPassword))
            missingValues.Add("SMTP_PASSWORD");
        if (string.IsNullOrWhiteSpace(_emailFrom))
            missingValues.Add("EMAIL_FROM");

        if (missingValues.Count == 0)
            return true;

        _logger.LogWarning(
            "Email sending is disabled because required SMTP values are missing: {MissingValues}.",
            string.Join(", ", missingValues));

        return false;
    }

    private async Task SendHtmlEmailAsync(string toEmail, string subject, string htmlBody)
    {
        try
        {
            using var mailMessage = new MailMessage
            {
                From = new MailAddress(_emailFrom!),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
            };
            mailMessage.To.Add(toEmail);

            using var smtpClient = new SmtpClient(_smtpHost!, _smtpPort)
            {
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_smtpUser!, _smtpPassword!),
            };

            await smtpClient.SendMailAsync(mailMessage);
            _logger.LogInformation("Order confirmation email sent to {Email}.", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}.", toEmail);
        }
    }
}
