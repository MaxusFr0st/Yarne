namespace YarneAPIBack.Services;

public class OrderConfirmationEmailMessage
{
    public int OrderId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string ToEmail { get; set; } = string.Empty;

    public DateTime OrderDateUtc { get; set; }

    public decimal Total { get; set; }

    public List<OrderConfirmationEmailItem> Items { get; set; } = [];
}

public class OrderConfirmationEmailItem
{
    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string? ProductSubtitle { get; set; }

    public string? ColorName { get; set; }

    public string? SizeName { get; set; }

    public bool? WithLace { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }
}
