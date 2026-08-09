using System;
using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class Order
{
    public int Id { get; set; }

    public int? CustomerId { get; set; }

    /// <summary>Contact email for guest checkout (no Customer account). Null for logged-in orders.</summary>
    public string? GuestEmail { get; set; }

    public int PaymentMethodId { get; set; }

    public int? ShippingAddrId { get; set; }

    public long TotalCents { get; set; }

    public int? ChannelId { get; set; }

    public long ChannelFeeCents { get; set; }

    public bool IsChannelFeeOverridden { get; set; }

    public string CurrencyCode { get; set; } = "UAH";

    public decimal ExchangeRateToBase { get; set; } = 1m;

    public string Status { get; set; } = null!;

    public DateTime OrderDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? EstimatedDelivery { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool IsVoid { get; set; }

    public string? RecipientFirstName { get; set; }

    public string? RecipientLastName { get; set; }

    public string? RecipientPhone { get; set; }

    public string? DeliveryCityRef { get; set; }

    public string? DeliveryCityName { get; set; }

    public string? DeliveryWarehouseRef { get; set; }

    public string? DeliveryWarehouseName { get; set; }

    public string? TtnNumber { get; set; }

    public string? TtnRef { get; set; }

    public DateTime? TtnCreatedAt { get; set; }

    public string? TrackingStatus { get; set; }

    public string? TrackingStatusCode { get; set; }

    public DateTime? TrackingCheckedAt { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual PaymentMethod PaymentMethod { get; set; } = null!;

    public virtual CustomerAddress? ShippingAddr { get; set; }
}
