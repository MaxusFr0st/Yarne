using System.Globalization;
using System.Net;
using System.Text;

namespace YarneAPIBack.Services;

public static class OrderConfirmationEmailBuilder
{
    private static readonly CultureInfo UkrainianCulture = CultureInfo.GetCultureInfo("uk-UA");

    // Site colours: cream, ink, maroon. Web-safe stacks only (no web fonts in mail clients).
    private const string Cream = "#F5F2ED";
    private const string Ink = "#2D241E";
    private const string Maroon = "#4A0E0E";
    private const string SerifStack = "Georgia,'Times New Roman',serif";
    private const string SansStack = "Arial,Helvetica,sans-serif";

    /// <summary>"Y071026-3": the public order number, or the Id for an order that has none (placed by hand).</summary>
    public static string FormatOrderNumber(OrderConfirmationEmailMessage message)
        => message.OrderNumber ?? $"#{message.OrderId}";

    public static string BuildSubject(OrderConfirmationEmailMessage message)
    {
        var number = FormatOrderNumber(message);
        return message.Event switch
        {
            OrderEmailEvent.Received => $"Замовлення {number} отримано",
            OrderEmailEvent.Confirmed => $"Замовлення {number} прийнято",
            OrderEmailEvent.Shipped => $"Замовлення {number} відправлено",
            OrderEmailEvent.Canceled => $"Замовлення {number} скасовано",
            OrderEmailEvent.InternalPlacedNotification => $"Нове замовлення {number}",
            OrderEmailEvent.PaymentConfirmed => $"Оплату замовлення {number} підтверджено",
            OrderEmailEvent.InternalPaymentChosen => $"Покупець обрав оплату: замовлення {number}",
            OrderEmailEvent.InternalReceiptUploaded => $"Покупець оплатив: замовлення {number}",
            _ => $"Замовлення {number}",
        };
    }

    /// <summary>Said in the accepted email and on the status page: every piece is made by hand to order.</summary>
    public const string ShipsWithinText = "Кожен виріб виготовляємо вручну на замовлення, тому відправка займає до 5 робочих днів після підтвердження.";

    public static string BuildHtml(OrderConfirmationEmailMessage message)
        => message.Event switch
        {
            OrderEmailEvent.InternalPlacedNotification => BuildInternalHtml(message),
            OrderEmailEvent.InternalPaymentChosen or OrderEmailEvent.InternalReceiptUploaded => BuildOwnerNoticeHtml(message),
            _ => BuildCustomerHtml(message),
        };

    /// <summary>The main button of an owner notice opens the admin's orders screen; the customer's status page is only a small line under it.</summary>
    private static string OwnerLinks(OrderConfirmationEmailMessage message)
    {
        var admin = string.IsNullOrWhiteSpace(message.AdminUrl)
            ? ""
            : $"""<p style="margin:18px 0 0;"><a href="{WebUtility.HtmlEncode(message.AdminUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;">Відкрити в адмінці</a></p>""";
        var status = string.IsNullOrWhiteSpace(message.StatusUrl)
            ? ""
            : $"""<p style="margin:12px 0 0;font-size:12px;color:#6b7280;">Сторінка замовлення для покупця: <a href="{WebUtility.HtmlEncode(message.StatusUrl)}" style="color:#6b7280;">статус</a></p>""";
        return admin + status;
    }

    /// <summary>A short note to the owner: a customer chose how to pay, or uploaded a receipt.</summary>
    private static string BuildOwnerNoticeHtml(OrderConfirmationEmailMessage message)
    {
        var number = WebUtility.HtmlEncode(FormatOrderNumber(message));
        var what = message.Event == OrderEmailEvent.InternalReceiptUploaded
            ? "Покупець каже, що оплатив переказом, і додав квитанцію. Перевірте надходження та позначте оплату в замовленні."
            : message.PaymentChoice switch
            {
                "Transfer" => "Покупець обрав оплату: переказ на картку.",
                "Pickup" => "Покупець обрав оплату: при отриманні.",
                _ => "Покупець змінив спосіб оплати.",
            };
        var link = OwnerLinks(message);
        return $"""
            <!doctype html>
            <html lang="uk">
              <body style="margin:0;padding:24px;background:#f7f7f8;font-family:Arial,sans-serif;color:#111827;">
                <div style="max-width:560px;background:#ffffff;border-radius:10px;padding:24px;">
                  <h1 style="margin:0 0 12px;font-size:20px;">Замовлення {number}</h1>
                  <p style="margin:0 0 8px;font-size:14px;">{what}</p>
                  <p style="margin:0 0 8px;font-size:14px;"><strong>Клієнт:</strong> {WebUtility.HtmlEncode(message.CustomerName)} ({WebUtility.HtmlEncode(message.CustomerEmail)})</p>
                  <p style="margin:0;font-size:14px;"><strong>Разом:</strong> {WebUtility.HtmlEncode(FormatPrice(message.Total))}</p>
                  {link}
                </div>
              </body>
            </html>
            """;
    }

    // ---------------------------------------------------------------------------------------
    // Customers: a phone-sized column. Order number first, each item a small block, one button.
    // ---------------------------------------------------------------------------------------

    private static string BuildCustomerHtml(OrderConfirmationEmailMessage message)
    {
        var safeName = WebUtility.HtmlEncode(message.CustomerName);
        var showEur = message.Locale == "en";
        var total = FormatPrice(message.Total, showEur ? message.EurTotal : null);
        var statusUrl = string.IsNullOrWhiteSpace(message.StatusUrl) ? null : message.StatusUrl.Trim();
        var fallbackUrl = statusUrl ?? (string.IsNullOrWhiteSpace(message.AccountUrl) ? null : message.AccountUrl.Trim());

        var (title, intro) = message.Event switch
        {
            OrderEmailEvent.Received => ("Дякуємо за замовлення", "Ми переглянемо замовлення і напишемо вам найближчим часом."),
            OrderEmailEvent.Confirmed => ("Ми беремося за ваше замовлення", $"Ваше замовлення прийнято. {ShipsWithinText}"),
            OrderEmailEvent.PaymentConfirmed => ("Оплату підтверджено", "Дякуємо! Ми отримали вашу оплату й продовжуємо роботу над замовленням."),
            OrderEmailEvent.Shipped => ("Замовлення відправлено", "Ваше замовлення відправлено."),
            OrderEmailEvent.Canceled => ("Замовлення скасовано", "Ваше замовлення було скасовано."),
            _ => ("Оновлення замовлення", "Статус вашого замовлення оновлено."),
        };

        var blocks = new StringBuilder();

        if (message.Event == OrderEmailEvent.Canceled)
        {
            var reason = message.CancelReason?.Trim();
            if (!string.IsNullOrWhiteSpace(reason))
                blocks.Append(Paragraph($"<strong>Причина:</strong> {WebUtility.HtmlEncode(reason)}"));
            blocks.Append(Paragraph("Якщо це помилка — відповідайте на цей лист."));
        }

        if (message.Event == OrderEmailEvent.Shipped && !string.IsNullOrWhiteSpace(message.TtnNumber))
        {
            blocks.Append($"""
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                  <tr>
                    <td style="padding:12px 16px;background:{Cream};border-radius:12px;font-family:{SansStack};font-size:14px;color:{Ink};">
                      ТТН Нової пошти<br />
                      <span style="font-family:{SerifStack};font-size:22px;letter-spacing:1px;">{WebUtility.HtmlEncode(message.TtnNumber.Trim())}</span>
                    </td>
                  </tr>
                </table>
                """);
        }

        // The items, then what to do next.
        var items = new StringBuilder();
        foreach (var item in message.Items)
            items.Append(BuildItemBlock(item, showEur));

        var action = new StringBuilder();
        switch (message.Event)
        {
            case OrderEmailEvent.Received:
                if (fallbackUrl != null)
                    action.Append(Button("Статус замовлення", fallbackUrl, primary: true));
                break;

            case OrderEmailEvent.Confirmed:
                action.Append(Paragraph($"Оберіть, як вам зручніше оплатити <strong>{WebUtility.HtmlEncode(total)}</strong>:"));
                if (statusUrl != null)
                {
                    action.Append(Button("Переказ на картку", AppendQuery(statusUrl, "pay=transfer"), primary: true));
                    // Abroad there is no pay-on-pickup: transfer in advance only.
                    if (!message.IsForeignDelivery)
                        action.Append(Button("Оплата при отриманні", AppendQuery(statusUrl, "pay=pickup"), primary: false));
                }
                else if (fallbackUrl != null)
                {
                    action.Append(Button("Статус замовлення", fallbackUrl, primary: true));
                }

                if (!message.IsForeignDelivery)
                    action.Append($"""<p style="margin:12px 0 0;font-family:{SansStack};font-size:12px;line-height:1.5;color:#6b6259;">При отриманні Нова пошта бере комісію за переказ коштів.</p>""");
                break;

            default:
                if (fallbackUrl != null)
                    action.Append(Button("Статус замовлення", fallbackUrl, primary: true));
                break;
        }

        return $$"""
            <!doctype html>
            <html lang="uk">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
              </head>
              <body style="margin:0;padding:0;background:{{Cream}};font-family:{{SansStack}};color:{{Ink}};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{{Cream}};">
                  <tr>
                    <td align="center" style="padding:20px 12px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
                        <tr>
                          <td align="center" style="padding:4px 0 16px;font-family:{{SerifStack}};font-size:24px;letter-spacing:2px;color:{{Ink}};">Yarné</td>
                        </tr>
                        <tr>
                          <td style="background:#ffffff;border-radius:20px;padding:24px 20px;">
                            <h1 style="margin:0 0 8px;font-family:{{SerifStack}};font-size:24px;line-height:1.25;font-weight:normal;color:{{Ink}};">{{title}}</h1>
                            <p style="margin:0 0 20px;font-family:{{SansStack}};font-size:14px;line-height:1.6;color:#4b4339;">Вітаємо, {{safeName}}! {{intro}}</p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                              <tr>
                                <td style="padding:14px 16px;background:{{Cream}};border-radius:14px;">
                                  <span style="font-family:{{SansStack}};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6b6259;">Номер замовлення</span><br />
                                  <span style="font-family:{{SerifStack}};font-size:30px;line-height:1.2;color:{{Maroon}};">{{WebUtility.HtmlEncode(FormatOrderNumber(message))}}</span>
                                </td>
                              </tr>
                            </table>

                            {{blocks}}

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
                              {{items}}
                              <tr>
                                <td style="padding:14px 0 0;font-family:{{SansStack}};font-size:14px;color:{{Ink}};">
                                  <strong>Разом:</strong> {{WebUtility.HtmlEncode(total)}}
                                </td>
                              </tr>
                              {{(string.IsNullOrWhiteSpace(message.DeliverySummary) ? "" : $"""<tr><td style="padding:6px 0 0;font-family:{SansStack};font-size:14px;color:{Ink};"><strong>Доставка:</strong> {WebUtility.HtmlEncode(message.DeliverySummary)}</td></tr>""")}}
                            </table>

                            <div style="margin:20px 0 0;">
                              {{action}}
                            </div>

                            <p style="margin:20px 0 0;font-family:{{SansStack}};font-size:13px;line-height:1.5;color:#6b6259;">
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

    private static string BuildItemBlock(OrderConfirmationEmailItem item, bool showEur)
    {
        var name = WebUtility.HtmlEncode(item.ProductName);
        var image = string.IsNullOrWhiteSpace(item.ProductImageUrl)
            ? ""
            : $"<img src=\"{WebUtility.HtmlEncode(item.ProductImageUrl)}\" alt=\"\" width=\"72\" height=\"72\" style=\"display:block;width:72px;height:72px;border-radius:12px;object-fit:cover;background:#EDE9E2;\" />";
        var details = WebUtility.HtmlEncode(BuildDetailsLine(item));
        var price = WebUtility.HtmlEncode(FormatPrice(item.UnitPrice, showEur ? item.EurUnitPrice : null));
        var quantity = item.Quantity > 1 ? $" × {item.Quantity}" : "";

        return $"""
            <tr>
              <td style="padding:0 0 14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="72" valign="top" style="width:72px;padding:0 14px 0 0;">{image}</td>
                    <td valign="top" style="font-family:{SansStack};color:{Ink};">
                      <div style="font-family:{SerifStack};font-size:18px;line-height:1.3;color:{Ink};">{name}</div>
                      <div style="margin:3px 0 0;font-size:13px;line-height:1.5;color:#6b6259;">{details}</div>
                      <div style="margin:4px 0 0;font-size:14px;color:{Ink};">{price}{quantity}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            """;
    }

    /// <summary>"Рожевий · One Size · з ремінцем · фурнітура: золото": colour, size, strap and hardware colour, the ones that are known.</summary>
    public static string BuildDetailsLine(OrderConfirmationEmailItem item)
    {
        var parts = new List<string>();
        var color = FirstText(item.ColorNameUk, item.ColorName);
        if (color != null) parts.Add(color);
        var size = FirstText(item.SizeNameUk, item.SizeName);
        if (size != null) parts.Add(size);
        switch (item.WithLace)
        {
            case true: parts.Add("з ремінцем"); break;
            case false: parts.Add("без ремінця"); break;
        }

        var hardware = FirstText(item.FurnitureColorNameUk, item.FurnitureColorName);
        if (hardware != null) parts.Add($"фурнітура: {hardware}");
        return string.Join(" · ", parts);
    }

    private static string? FirstText(params string?[] values)
        => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();

    private static string Paragraph(string htmlInner)
        => $"""<p style="margin:0 0 16px;font-family:{SansStack};font-size:14px;line-height:1.6;color:{Ink};">{htmlInner}</p>""";

    /// <summary>A full-width pill button in a table, so it holds its shape in Gmail and Apple Mail.</summary>
    private static string Button(string label, string url, bool primary)
    {
        var background = primary ? Ink : "#ffffff";
        var color = primary ? Cream : Ink;
        var border = primary ? Ink : Ink;
        return $"""
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;">
              <tr>
                <td align="center" bgcolor="{background}" style="border-radius:999px;border:1px solid {border};">
                  <a href="{WebUtility.HtmlEncode(url)}" style="display:block;padding:14px 20px;font-family:{SansStack};font-size:14px;letter-spacing:0.5px;color:{color};text-decoration:none;border-radius:999px;">{WebUtility.HtmlEncode(label)}</a>
                </td>
              </tr>
            </table>
            """;
    }

    private static string AppendQuery(string url, string query)
        => url + (url.Contains('?') ? "&" : "?") + query;

    // ---------------------------------------------------------------------------------------
    // The owner's internal notice keeps the full table.
    // ---------------------------------------------------------------------------------------

    private static string BuildInternalHtml(OrderConfirmationEmailMessage message)
    {
        var safeName = WebUtility.HtmlEncode(message.CustomerName);
        var safeCustomerEmail = WebUtility.HtmlEncode(message.CustomerEmail);
        var orderDate = message.OrderDateUtc.ToLocalTime().ToString("dd.MM.yyyy HH:mm", UkrainianCulture);
        var showEur = message.Locale == "en";
        var total = FormatPrice(message.Total, showEur ? message.EurTotal : null);
        var statusUrl = string.IsNullOrWhiteSpace(message.StatusUrl) ? null : message.StatusUrl.Trim();
        var paymentChoice = message.PaymentChoice switch
        {
            "Transfer" => "Переказ на картку",
            "Pickup" => "Оплата при отриманні",
            _ => null,
        };

        var rowsBuilder = new StringBuilder();
        foreach (var item in message.Items)
        {
            var safeCode = WebUtility.HtmlEncode(item.ProductCode);
            var safeProductName = WebUtility.HtmlEncode(item.ProductName);
            var safeImg = WebUtility.HtmlEncode(item.ProductImageUrl ?? string.Empty);
            var safeSubtitle = WebUtility.HtmlEncode(item.ProductSubtitle ?? "—");
            var safeColor = WebUtility.HtmlEncode(item.ColorName ?? "—");
            var safeSize = WebUtility.HtmlEncode(item.SizeName ?? "—");
            var safeFurnitureColor = WebUtility.HtmlEncode(item.FurnitureColorName ?? "—");
            var laceLabel = FormatLaceLabel(item.WithLace);
            var eurLineTotal = showEur && item.EurUnitPrice.HasValue ? item.EurUnitPrice.Value * item.Quantity : (decimal?)null;
            var lineTotal = FormatPrice(item.UnitPrice * item.Quantity, eurLineTotal);
            var unitPrice = FormatPrice(item.UnitPrice, showEur ? item.EurUnitPrice : null);

            rowsBuilder.AppendLine($"""
                    <tr>
                      <td style="padding:8px;border:1px solid #e5e7eb;">
                        {(string.IsNullOrWhiteSpace(safeImg) ? "" : $"<img src=\"{safeImg}\" alt=\"\" width=\"56\" height=\"56\" style=\"display:block;border-radius:10px;object-fit:cover;background:#f3f4f6;\" />")}
                      </td>
                      <td style="padding:8px;border:1px solid #e5e7eb;">{safeCode}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;">{safeProductName}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;">{safeSubtitle}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;">{safeColor}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">{safeSize}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;">{laceLabel}</td>
                      <td style="padding:8px;border:1px solid #e5e7eb;">{safeFurnitureColor}</td>
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
                      <table role="presentation" width="900" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;">
                        <tr>
                          <td style="padding:24px;border-bottom:1px solid #e5e7eb;">
                            <h1 style="margin:0;font-size:22px;line-height:1.3;">Нове замовлення в Yarné</h1>
                            <p style="margin:12px 0 0;font-size:14px;color:#4b5563;">
                              Надійшло нове замовлення від клієнта.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:24px;">
                            <p style="margin:0 0 8px;font-size:14px;"><strong>Клієнт:</strong> {{safeName}}</p>
                            <p style="margin:0 0 8px;font-size:14px;"><strong>Email клієнта:</strong> {{safeCustomerEmail}}</p>
                            <p style="margin:0 0 8px;font-size:14px;"><strong>Номер замовлення:</strong> {{WebUtility.HtmlEncode(FormatOrderNumber(message))}}</p>
                            <p style="margin:0 0 8px;font-size:14px;"><strong>Дата:</strong> {{orderDate}}</p>
                            <p style="margin:0 0 8px;font-size:14px;"><strong>Оплата:</strong> {{(paymentChoice ?? "очікуємо вибір покупця")}}</p>
                            <p style="margin:0 0 16px;font-size:14px;"><strong>Разом:</strong> {{total}}</p>

                            {{OwnerLinks(message)}}
                            <div style="height:16px;"></div>

                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
                              <thead>
                                <tr style="background:#f3f4f6;">
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Фото</th>
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Код</th>
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Модель</th>
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Опис</th>
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Колір</th>
                                  <th align="center" style="padding:8px;border:1px solid #e5e7eb;">Розмір</th>
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Ремінець</th>
                                  <th align="left" style="padding:8px;border:1px solid #e5e7eb;">Фурнітура</th>
                                  <th align="center" style="padding:8px;border:1px solid #e5e7eb;">Кількість</th>
                                  <th align="right" style="padding:8px;border:1px solid #e5e7eb;">Ціна</th>
                                  <th align="right" style="padding:8px;border:1px solid #e5e7eb;">Разом</th>
                                </tr>
                              </thead>
                              <tbody>
                                {{rowsBuilder}}
                              </tbody>
                            </table>
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

    private static string FormatLaceLabel(bool? withLace)
        => withLace switch
        {
            true => "З ремінцем",
            false => "Без ремінця",
            _ => "—",
        };

    /// <summary>Hryvnia is always the primary figure (that's what the card is charged) — a EUR
    /// amount, when given, is appended in parentheses for reference only.</summary>
    private static string FormatPrice(decimal price, decimal? eurPrice = null)
    {
        var uah = HryvniaPriceFormatter.Format(price);
        return eurPrice is not { } eur ? uah : $"{uah} (€{eur.ToString("N2", CultureInfo.InvariantCulture)})";
    }
}
