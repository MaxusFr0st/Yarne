namespace YarneAPIBack.Services;

public enum OrderEmailEvent
{
    Received,
    Confirmed,
    Shipped,
    Canceled,
    InternalPlacedNotification,
}

public class OrderConfirmationEmailMessage
{
    public int OrderId { get; set; }

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

    public string? SizeName { get; set; }

    public bool? WithLace { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal? EurUnitPrice { get; set; }
}
