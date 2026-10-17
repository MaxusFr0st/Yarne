using System.Text.Json.Nodes;

namespace YarneAPIBack.Data;

/// <summary>
/// The redesigned Delivery &amp; Returns and Terms pages (approved 17 October 2026) as saved data rather than
/// built-in text: the Delivery facts, section icons and return steps are added to the saved page, and the
/// Terms page is saved once with today's text. Only missing fields and a missing Terms row are written, so
/// anything the owner edits afterwards stays. Generated from YarneFront/scripts/legal-terms.json.
/// </summary>
public static class StorefrontPageSeeds
{
    /// <summary>A setting key, a dot path, and the JSON to put there while nothing is there yet.</summary>
    public sealed record Addition(string Key, string Path, string Json);

    public static readonly Addition[] Additions =
    [
        new("yarne.delivery.v1", "intro", """
        {"uk":"Кожен виріб ми в'яжемо вручну під замовлення. Тут — коли ми його відправляємо, як він їде до вас і як працює повернення.","en":"Every piece is made by hand to order. Here is when it ships, how it travels and how returns work."}
        """),
        new("yarne.delivery.v1", "glance", """
        [{"value":{"uk":"0–1 день","en":"0–1 day"},"label":{"uk":"Підтверджуємо замовлення","en":"We confirm your order"}},{"value":{"uk":"≤ 5 днів","en":"≤ 5 days"},"label":{"uk":"Робочих днів на виготовлення й відправку","en":"Working days to make and ship"}},{"value":{"uk":"Нова пошта","en":"Nova Poshta"},"label":{"uk":"Відділення або поштомат в Україні","en":"Branch or parcel locker in Ukraine"}},{"value":{"uk":"14 днів","en":"14 days"},"label":{"uk":"Щоб повернути виріб без слідів носіння","en":"To return an unworn piece"}}]
        """),
        new("yarne.delivery.v1", "sections.0.icon", """
        "making"
        """),
        new("yarne.delivery.v1", "sections.1.icon", """
        "ukraine"
        """),
        new("yarne.delivery.v1", "sections.2.icon", """
        "abroad"
        """),
        new("yarne.delivery.v1", "sections.3.icon", """
        "returns"
        """),
        new("yarne.delivery.v1", "sections.4.icon", """
        "defect"
        """),
        new("yarne.delivery.v1", "sections.3.steps", """
        [{"uk":"Напишіть нам із номером замовлення","en":"Write to us with your order number"},{"uk":"Ми надішлемо адресу для повернення","en":"We reply with the return address"},{"uk":"Ви відправляєте виріб","en":"You send the piece back"},{"uk":"Ми перевіряємо його й повертаємо кошти","en":"We check it and refund the price"}]
        """),
    ];

    public const string TermsKey = "yarne.terms.v1";

    public const string TermsJson =
        """
        {"version":1,"lastUpdated":"2026-07","summary":[{"uk":"На сайті кошти не списуються: ви оплачуєте після того, як ми приймемо замовлення.","en":"Nothing is charged on the site; you pay after we accept the order."},{"uk":"Повернення — за умовами сторінки «Доставка та повернення»: 14 днів, без слідів носіння.","en":"Returns follow the Delivery & Returns page: 14 days, unworn."},{"uk":"Ці умови ніколи не обмежують ваших прав споживача.","en":"Your rights as a consumer are never limited by these terms."}],"sections":[{"heading":{"uk":"Згода з умовами","en":"Agreement"},"body":{"uk":"Користуючись yarne-acc.com і оформлюючи замовлення, ви погоджуєтеся з цими Умовами. Якщо не погоджуєтесь — не користуйтеся сайтом.","en":"By accessing yarne-acc.com and placing an order, you agree to these Terms & Conditions. If you do not agree, please do not use our website."}},{"heading":{"uk":"Товари й ціни","en":"Products and prices"},"body":{"uk":"Описи товарів, ціни та наявність можуть змінюватися без попередження. Ми можемо відмовити або скасувати замовлення при помилках у ціні, підозрі на шахрайство або нестачі товару.","en":"All product descriptions, prices, and availability are subject to change without notice. We reserve the right to refuse or cancel orders in cases of pricing errors, suspected fraud, or stock limitations."}},{"heading":{"uk":"Оплата","en":"Payment"},"body":{"uk":"На сайті кошти не списуються. Після того як замовлення прийнято, ви обираєте оплату переказом на картку або при отриманні в Новій пошті. Ви відповідаєте за коректні контактні та адресні дані.","en":"Nothing is charged on the site. After your order is accepted, you choose to pay by bank transfer or on pickup at Nova Poshta. You are responsible for providing accurate shipping and contact details."}},{"heading":{"uk":"Доставка й ризики","en":"Delivery and risk"},"body":{"uk":"Ризик втрати переходить до вас після передачі посилки перевізнику. Терміни доставки є орієнтовними.","en":"Risk of loss passes to you upon delivery to the carrier. Delivery times are estimates only and may vary due to customs, weather, or carrier delays."}},{"heading":{"uk":"Повернення","en":"Returns"},"body":{"uk":"Повернення приймаються лише за умовами сторінки «Доставка та повернення».","en":"Returns are accepted only under the conditions stated on our Delivery & Returns page."}},{"heading":{"uk":"Матеріали сайту","en":"Site content"},"body":{"uk":"Контент сайту — зображення, тексти, брендинг — належить Yarné або правовласникам і не може копіюватися без дозволу.","en":"Content on this site — including images, copy, and branding — is owned by Yarné or its licensors and may not be reproduced without permission."}},{"heading":{"uk":"Відповідальність","en":"Liability"},"body":{"uk":"У межах, дозволених законом, Yarné не несе відповідальності за непрямі збитки від використання сайту чи товарів. Ваші законні права споживача не обмежуються.","en":"To the fullest extent permitted by law, Yarné is not liable for indirect or consequential damages arising from use of the site or products. Nothing in these terms limits your statutory consumer rights."}},{"heading":{"uk":"Право та контакти","en":"Law and contact"},"body":{"uk":"Ці умови регулюються законодавством країни, де працює Yarné. Питання: {{email}}.","en":"These terms are governed by the laws applicable where Yarné operates. For questions, contact {{email}}."}}]}
        """;

    /// <summary>Puts <see cref="Addition.Json"/> at the path when nothing is there; returns whether it did.</summary>
    public static bool TryAdd(JsonNode root, Addition addition)
    {
        var segments = addition.Path.Split('.');
        JsonNode? parent = root;
        foreach (var segment in segments[..^1])
        {
            parent = parent switch
            {
                JsonObject obj => obj[segment],
                JsonArray arr when int.TryParse(segment, out var i) && i >= 0 && i < arr.Count => arr[i],
                _ => null,
            };
            if (parent is null) return false;
        }
        if (parent is not JsonObject target || target[segments[^1]] is not null) return false;
        target[segments[^1]] = JsonNode.Parse(addition.Json);
        return true;
    }
}
