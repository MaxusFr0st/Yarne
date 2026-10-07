namespace YarneAPIBack.Services;

public enum OrderEmailEvent
{
    Received,
    Confirmed,
    Shipped,
    Canceled,
    InternalPlacedNotification,
    PaymentConfirmed,
    InternalPaymentChosen,
    InternalReceiptUploaded,
}

public class OrderConfirmationEmailMessage
{
    public int OrderId { get; set; }

    /// <summary>The public number shown instead of the Id ("Y071026-3"). Null falls back to the Id.</summary>
    public string? OrderNumber { get; set; }

    /// <summary>{site}/{locale}/order/{token}: where the email's button leads. Empty for orders without a token.</summary>
    public string StatusUrl { get; set; } = string.Empty;

    public string? TtnNumber { get; set; }

    public string? CancelReason { get; set; }

    /// <summary>Delivery abroad: only payment by transfer is offered.</summary>
    public bool IsForeignDelivery { get; set; }

    /// <summary>Where the order goes, as one line (city and branch, or country, city and address).</summary>
    public string DeliverySummary { get; set; } = string.Empty;

    /// <summary>null, "Transfer" or "Pickup": shown on the internal notice once the customer has chosen.</summary>
    public string? PaymentChoice { get; set; }

    public OrderEmailEvent Event { get; set; } = OrderEmailEvent.Received;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerEmail { get; set; } = string.Empty;

    public string ToEmail { get; set; } = string.Empty;

    public List<string> BccEmails { get; set; } = [];

    public string AccountUrl { get; set; } = string.Empty;

    public DateTime OrderDateUtc { get; set; }

    public decimal Total { get; set; }

    /// <summary>Storefront UI language at checkout ("en"/"uk"). Only "en" shows EUR alongside hryvnia.</summary>
    public string? Locale { get; set; }

    /// <summary>Null unless every line item has a EUR snapshot — a partial total would understate the order.</summary>
    public decimal? EurTotal { get; set; }

    public List<OrderConfirmationEmailItem> Items { get; set; } = [];
}

public class OrderConfirmationEmailItem
{
    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string? ProductImageUrl { get; set; }

    public string? ProductSubtitle { get; set; }

    public string? ColorName { get; set; }

    /// <summary>Ukrainian catalogue names, when the catalogue has them: the email is in Ukrainian.</summary>
    public string? ColorNameUk { get; set; }

    public string? SizeNameUk { get; set; }

    public string? FurnitureColorNameUk { get; set; }

    public string? SizeName { get; set; }

    public string? FurnitureColorName { get; set; }

    public bool? WithLace { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal? EurUnitPrice { get; set; }
}
