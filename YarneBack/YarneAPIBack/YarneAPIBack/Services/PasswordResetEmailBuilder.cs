using System.Net;
using static YarneAPIBack.Services.OrderConfirmationEmailBuilder;

namespace YarneAPIBack.Services;

/// <summary>The "forgot password" email, in the same frame as the customer's order emails (header, white card, one button).</summary>
public static class PasswordResetEmailBuilder
{
    public static string BuildSubject(PasswordResetEmailMessage message)
    {
        var en = message.Locale == "en";
        if (message.OAuthProvider != null)
            return en ? "Yarné · Signing in to your account" : "Yarné · Вхід у ваш акаунт";
        return en ? "Yarné · New password for your account" : "Yarné · Новий пароль для вашого акаунта";
    }

    public static string BuildHtml(PasswordResetEmailMessage message)
    {
        var en = message.Locale == "en";
        string title, text, buttonLabel, buttonUrl, footer;
        if (message.OAuthProvider != null)
        {
            var provider = message.OAuthProvider;
            title = en ? $"Your account uses {provider} sign-in" : $"Ваш акаунт використовує вхід через {provider}";
            text = en
                ? $"You asked to change the password on yarne-acc.com, but this account has no password: it signs in with {provider}. Press \"Sign in with {provider}\" in the sign-in window."
                : $"Ви попросили змінити пароль на yarne-acc.com, але в цього акаунта немає пароля: він працює через вхід {provider}. Натисніть «Увійти через {provider}» у вікні входу.";
            buttonLabel = en ? "Go to the site" : "Перейти на сайт";
            buttonUrl = message.SiteUrl;
            footer = en
                ? "No password was changed. If this wasn't you, just ignore this email."
                : "Пароль не змінювався. Якщо це були не ви, просто проігноруйте цей лист.";
        }
        else
        {
            title = en ? "Create a new password" : "Створіть новий пароль";
            text = en
                ? "You asked to change the password on yarne-acc.com. The link works for 30 minutes and only once."
                : "Ви попросили змінити пароль на yarne-acc.com. Посилання діє 30 хвилин і працює один раз.";
            buttonLabel = en ? "Create a new password" : "Створити новий пароль";
            buttonUrl = message.ResetUrl;
            footer = en
                ? "If this wasn't you, just ignore this email — your password will not change."
                : "Якщо це були не ви, просто проігноруйте цей лист — пароль не зміниться.";
        }

        var preheader = WebUtility.HtmlEncode(title);
        return $$"""
            <!doctype html>
            <html lang="{{(en ? "en" : "uk")}}">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
              </head>
              <body style="margin:0;padding:0;background:{{Cream}};font-family:{{SansStack}};color:{{Ink}};">
                <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{{preheader}}</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{{Cream}};">
                  <tr>
                    <td align="center" style="padding:20px 12px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
                        <tr>
                          <td align="center" style="padding:4px 0 16px;font-family:{{SerifStack}};font-size:24px;letter-spacing:2px;color:{{Ink}};">Yarné</td>
                        </tr>
                        <tr>
                          <td style="background:#ffffff;border-radius:20px;padding:24px 20px;">
                            <h1 style="margin:0 0 8px;font-family:{{SerifStack}};font-size:24px;line-height:1.25;font-weight:normal;color:{{Ink}};">{{WebUtility.HtmlEncode(title)}}</h1>
                            <p style="margin:0 0 20px;font-family:{{SansStack}};font-size:14px;line-height:1.6;color:#4b4339;">{{WebUtility.HtmlEncode(text)}}</p>
                            {{(string.IsNullOrWhiteSpace(buttonUrl) ? "" : Button(buttonLabel, buttonUrl, primary: true))}}
                            <p style="margin:20px 0 0;font-family:{{SansStack}};font-size:13px;line-height:1.5;color:#6b6259;">
                              {{WebUtility.HtmlEncode(footer)}}
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
}
