using System;
using System.Collections.Generic;
using YarneAPIBack.Accounting.Models;

namespace YarneAPIBack.Models;

public partial class Order
{
    public int Id { get; set; }

    /// <summary>
    /// Client-generated idempotency key for orders queued offline. Null for a normal online
    /// order. Unique among non-null values — see CreateOrderCore's dedup check.
    /// </summary>
    public Guid? ClientOrderId { get; set; }

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

    /// <summary>Which Nova Poshta sender profile created the waybill -- needed to cancel it later, since Nova Poshta only lets the creating account delete its own documents.</summary>
    public string? TtnSenderProfileId { get; set; }

    public string? TrackingStatus { get; set; }

    public string? TrackingStatusCode { get; set; }

    public DateTime? TrackingCheckedAt { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual PaymentMethod PaymentMethod { get; set; } = null!;

    public virtual CustomerAddress? ShippingAddr { get; set; }

    public virtual SalesChannel? Channel { get; set; }

    public virtual AccountingCurrency Currency { get; set; } = null!;

    public virtual ICollection<ReturnOrder> ReturnOrders { get; set; } = new List<ReturnOrder>();
}
