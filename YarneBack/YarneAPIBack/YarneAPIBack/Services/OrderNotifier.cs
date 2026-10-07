using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

/// <summary>Tells the owner (the address already used for new-order notices) when a customer picks how to pay or uploads a receipt.</summary>
public class OrderNotifier
{
    private readonly IEmailService _email;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OrderNotifier> _logger;

    public OrderNotifier(IEmailService email, IConfiguration configuration, ILogger<OrderNotifier> logger)
    {
        _email = email;
        _configuration = configuration;
        _logger = logger;
    }

    public void NotifyOwner(Order order, OrderEmailEvent emailEvent)
    {
        var to = (_configuration["ORDER_RECEIVED_NOTIFY_EMAIL"] ?? Environment.GetEnvironmentVariable("ORDER_RECEIVED_NOTIFY_EMAIL"))?.Trim();
        if (string.IsNullOrWhiteSpace(to))
        {
            _logger.LogWarning("ORDER_RECEIVED_NOTIFY_EMAIL is not configured; the owner notice for order #{OrderId} is skipped.", order.Id);
            return;
        }

        var message = new OrderConfirmationEmailMessage
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            Event = emailEvent,
            CustomerName = $"{order.RecipientFirstName} {order.RecipientLastName}".Trim(),
            CustomerEmail = order.Customer?.Email ?? order.GuestEmail ?? string.Empty,
            ToEmail = to,
            StatusUrl = OrderLinks.StatusUrl(_configuration, order) ?? string.Empty,
            PaymentChoice = order.PaymentChoice,
            OrderDateUtc = order.OrderDate,
            Total = order.TotalCents / 100m,
            IsForeignDelivery = order.IsForeignDelivery,
        };

        _ = Task.Run(async () =>
        {
            try
            {
                await _email.SendOrderConfirmationAsync(message, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Owner notice ({Event}) for order #{OrderId} failed.", emailEvent, order.Id);
            }
        });
    }
}
