using YarneAPIBack.Models;

namespace YarneAPIBack.Services;

/// <summary>Where an order's customer-facing pages live, built the same way for the API, the emails and the admin.</summary>
public static class OrderLinks
{
    public static string FrontendBase(IConfiguration configuration) =>
        (configuration["FRONTEND_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("FRONTEND_BASE_URL")
            ?? "https://yarne-acc.com").Trim().TrimEnd('/');

    /// <summary>The language an order's pages and emails are in: the one chosen at checkout, Ukrainian otherwise.</summary>
    public static string LocaleOf(Order order) => order.Locale == "en" ? "en" : "uk";

    /// <summary>Where the order goes, as one line: the Nova Poshta city and branch, or country, city and branch or address abroad.</summary>
    public static string DeliverySummary(Order order)
    {
        var parts = order.IsForeignDelivery
            ? new[] { order.DeliveryCountryName, order.DeliveryCityName, order.DeliveryCarrier == ForeignDelivery.CarrierNovaPost ? order.DeliveryWarehouseName : order.DeliveryAddress, order.DeliveryPostalCode }
            : new[] { order.DeliveryCityName, order.DeliveryWarehouseName };
        return string.Join(", ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
    }

    /// <summary>{site origin}/{locale}/order/{token}, or null for an order without a token (placed by hand in the admin).</summary>
    public static string? StatusUrl(IConfiguration configuration, Order order) =>
        string.IsNullOrWhiteSpace(order.StatusToken)
            ? null
            : $"{FrontendBase(configuration)}/{LocaleOf(order)}/order/{order.StatusToken}";
}
