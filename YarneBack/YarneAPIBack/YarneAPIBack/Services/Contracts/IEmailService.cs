using YarneAPIBack.Services;

namespace YarneAPIBack.Services.Contracts;

public interface IEmailService
{
    Task SendOrderConfirmationAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default);

    Task SendOrderReceiptAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default);
}
