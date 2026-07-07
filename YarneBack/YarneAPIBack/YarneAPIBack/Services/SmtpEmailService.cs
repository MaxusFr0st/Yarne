using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class SmtpEmailService : IEmailService
{
    private static readonly TimeSpan DefaultSmtpTimeout = TimeSpan.FromSeconds(20);
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
        await SendHtmlEmailAsync(message.ToEmail, subject, htmlBody, message.BccEmails, ct);
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

    private async Task SendHtmlEmailAsync(string toEmail, string subject, string htmlBody, List<string> bccEmails, CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(DefaultSmtpTimeout);
        var timeoutToken = timeoutCts.Token;

        try
        {
            var mailMessage = new MimeMessage();
            mailMessage.From.Add(MailboxAddress.Parse(_emailFrom!));
            mailMessage.To.Add(MailboxAddress.Parse(toEmail));
            foreach (var bcc in bccEmails.Where(e => !string.IsNullOrWhiteSpace(e)))
                mailMessage.Bcc.Add(MailboxAddress.Parse(bcc));
            mailMessage.Subject = subject;
            mailMessage.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            client.Timeout = (int)DefaultSmtpTimeout.TotalMilliseconds;
            var socketOptions = _smtpPort == 465
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTls;

            _logger.LogInformation("SMTP connect to {Host}:{Port} (mode={Mode}).", _smtpHost, _smtpPort, socketOptions);
            await client.ConnectAsync(_smtpHost!, _smtpPort, socketOptions, timeoutToken);

            _logger.LogInformation("SMTP authenticate as {User}.", _smtpUser);
            await client.AuthenticateAsync(_smtpUser!, _smtpPassword!, timeoutToken);

            _logger.LogInformation("SMTP send message to {Email}.", toEmail);
            await client.SendAsync(mailMessage, timeoutToken);

            await client.DisconnectAsync(true, timeoutToken);

            _logger.LogInformation("Order confirmation email sent to {Email}.", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email} via {Host}:{Port}.", toEmail, _smtpHost, _smtpPort);
        }
    }
}
