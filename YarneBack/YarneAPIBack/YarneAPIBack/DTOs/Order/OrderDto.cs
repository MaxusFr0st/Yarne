namespace YarneAPIBack.DTOs.Order;

public class OrderDto
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerEmail { get; set; } = string.Empty;

    public decimal Total { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime OrderDate { get; set; }

    public DateTime? EstimatedDelivery { get; set; }

    public int PaymentMethodId { get; set; }

    public string PaymentMethodName { get; set; } = string.Empty;

    public int? ShippingAddrId { get; set; }

    public List<OrderItemDto> Items { get; set; } = [];
}

public class OrderItemDto
{
    public int Id { get; set; }

    public int ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string? ProductImageUrl { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }

    public int? CountryId { get; set; }

    public string? CountryName { get; set; }
}
