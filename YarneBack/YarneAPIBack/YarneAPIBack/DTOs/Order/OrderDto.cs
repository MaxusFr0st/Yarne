namespace YarneAPIBack.DTOs.Order;

public class OrderDto
{
    public int Id { get; set; }

    public int? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerEmail { get; set; } = string.Empty;

    public string? CustomerPhoneNumber { get; set; }

    public decimal Total { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime OrderDate { get; set; }

    public DateTime? EstimatedDelivery { get; set; }

    public int PaymentMethodId { get; set; }

    public string PaymentMethodName { get; set; } = string.Empty;

    public int? ShippingAddrId { get; set; }

    public string? RecipientFirstName { get; set; }

    public string? RecipientLastName { get; set; }

    public string? RecipientPhone { get; set; }

    public string? DeliveryCityRef { get; set; }

    public string? DeliveryCityName { get; set; }

    public string? DeliveryWarehouseRef { get; set; }

    public string? DeliveryWarehouseName { get; set; }

    public string? TtnNumber { get; set; }

    public DateTime? TtnCreatedAt { get; set; }

    public string? TrackingStatus { get; set; }

    public DateTime? TrackingCheckedAt { get; set; }

    public List<OrderItemDto> Items { get; set; } = [];
}

public class OrderItemDto
{
    public int Id { get; set; }

    public int? ProductId { get; set; }

    public int? ParentOrderItemId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string? ProductImageUrl { get; set; }

    public string? ProductSubtitle { get; set; }

    public string? ColorName { get; set; }

    public string? FurnitureColorName { get; set; }

    public string? SizeName { get; set; }

    public bool? WithLace { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }

    /// <summary>EUR unit price snapshotted at purchase time. Null for orders placed before EUR pricing existed.</summary>
    public decimal? EurUnitPrice { get; set; }

    public decimal? EurLineTotal { get; set; }
}
