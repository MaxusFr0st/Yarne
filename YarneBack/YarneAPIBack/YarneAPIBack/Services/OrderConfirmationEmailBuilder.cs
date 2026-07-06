using System.Globalization;
using System.Net;
using System.Text;

namespace YarneAPIBack.Services;

public static class OrderConfirmationEmailBuilder
{
    private static readonly CultureInfo UkrainianCulture = CultureInfo.GetCultureInfo("uk-UA");

    public static string BuildSubject(OrderConfirmationEmailMessage message)
        => $"Підтвердження замовлення №{message.OrderId}";

    public static string BuildHtml(OrderConfirmationEmailMessage message)
    {
        var safeName = WebUtility.HtmlEncode(message.CustomerName);
        var orderDate = message.OrderDateUtc.ToLocalTime().ToString("dd.MM.yyyy HH:mm", UkrainianCulture);
        var total = FormatPrice(message.Total);

        var rowsBuilder = new StringBuilder();
        foreach (var item in message.Items)
        {
            var safeCode = WebUtility.HtmlEncode(item.ProductCode);
            var safeProductName = WebUtility.HtmlEncode(item.ProductName);
            var lineTotal = FormatPrice(item.UnitPrice * item.Quantity);
            var unitPrice = FormatPrice(item.UnitPrice);

            rowsBuilder.AppendLine($"""
                    <tr>
                      <td style="padding:8px;border:1px solid #e5e7eb;">{safeCode}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;">{safeProductName}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">{item.Quantity}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">{unitPrice}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">{lineTotal}</td>
                    </tr>
                """);
        }

        return $$"""
            <!doctype html>
            <html lang="uk">
              <body style="margin:0;padding:0;background:#f7f7f8;font-family:Arial,sans-serif;color:#111827;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;">
                        <tr>
                          <td style="padding:24px;border-bottom:1px solid #e5e7eb;">
                            <h1 style="margin:0;font-size:22px;line-height:1.3;">Дякуємо за замовлення в Yarne</h1>
                            <p style="margin:12px 0 0;font-size:14px;color:#4b5563;">
                              Вітаємо, {{safeName}}! Ми отримали ваше замовлення та вже передали його в обробку.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:24px;">
                            <p style="margin:0 0 8px;font-size:14px;"><strong>Номер замовлення:</strong> #{{message.OrderId}}</p>
                            <p style="margin:0 0 8px;font-size:14px;"><strong>Дата:</strong> {{orderDate}}</p>
                            <p style="margin:0 0 16px;font-size:14px;"><strong>Сума:</strong> {{total}}</p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
                              <thead>
                                <tr style="background:#f3f4f6;">
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Код</th>
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Товар</th>
                                  <th align="center" style="padding:8px;border:1px solid #e5e7eb;">К-сть</th>
                                  <th align="right" style="padding:8px;border:1px solid #e5e7eb;">Ціна</th>
                                  <th align="right" style="padding:8px;border:1px solid #e5e7eb;">Разом</th>
                                </tr>
                              </thead>
                              <tbody>
                                {{rowsBuilder}}
                              </tbody>
                            </table>

                            <p style="margin:16px 0 0;font-size:14px;color:#4b5563;">
                              Якщо у вас є питання, просто відповідайте на цей лист.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """;
    }

    private static string FormatPrice(decimal price)
        => HryvniaPriceFormatter.Format(price);
}
