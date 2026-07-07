using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class ResendEmailService : IEmailService
{
    private static readonly Uri ResendEndpoint = new("https://api.resend.com/emails");
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ResendEmailService> _logger;
    private readonly string? _apiKey;
    private readonly string? _emailFrom;

    public ResendEmailService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<ResendEmailService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _apiKey = configuration["RESEND_API_KEY"] ?? Environment.GetEnvironmentVariable("RESEND_API_KEY");
        _emailFrom = configuration["EMAIL_FROM"] ?? Environment.GetEnvironmentVariable("EMAIL_FROM");
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

        if (string.IsNullOrWhiteSpace(_apiKey))
            missingValues.Add("RESEND_API_KEY");
        if (string.IsNullOrWhiteSpace(_emailFrom))
            missingValues.Add("EMAIL_FROM");

        if (missingValues.Count == 0)
            return true;

        _logger.LogWarning(
            "Email sending is disabled because required Resend values are missing: {MissingValues}.",
            string.Join(", ", missingValues));

        return false;
    }

    private async Task SendHtmlEmailAsync(string toEmail, string subject, string htmlBody, List<string> bccEmails, CancellationToken ct)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            var payload = new
            {
                from = _emailFrom,
                to = new[] { toEmail },
                bcc = bccEmails.Count > 0 ? bccEmails : null,
                subject,
                html = htmlBody,
            };

            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Resend send message to {Email}.", toEmail);
            using var response = await client.PostAsync(ResendEndpoint, content, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Resend failed sending email to {Email}. Status={StatusCode}. Body={Body}",
                    toEmail,
                    (int)response.StatusCode,
                    responseBody);
                return;
            }

            _logger.LogInformation("Order confirmation email sent to {Email} (Resend).", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Resend failed sending email to {Email}.", toEmail);
        }
    }
}

