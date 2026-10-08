using System;
using System.Collections.Generic;
using YarneAPIBack.Accounting.Models;

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

    /// <summary>Storefront UI language at checkout ("en"/"uk") — decides whether order emails show EUR alongside UAH. Null for orders placed before this was tracked.</summary>
    public string? Locale { get; set; }

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

    /// <summary>Public order number shown to the customer: "Y" + DDMMYY (the order's day in Kyiv) + "-" + that day's running count, e.g. "Y071026-3". Unique. Null only until the startup backfill has numbered an order placed before this existed.</summary>
    public string? OrderNumber { get; set; }

    /// <summary>Unguessable URL-safe token that opens the order's public status page (/{locale}/order/{token}).</summary>
    public string? StatusToken { get; set; }

    /// <summary>How the customer chose to pay: null (not yet), "Transfer" or "Pickup" (paid to Nova Poshta on collection).</summary>
    public string? PaymentChoice { get; set; }

    public DateTime? PaymentChoiceAt { get; set; }

    /// <summary>Why the order was canceled, shown to the customer on the status page and in the cancellation email.</summary>
    public string? CancelReason { get; set; }

    /// <summary>The order goes abroad: it never gets an automatic Nova Poshta waybill, and its TTN is typed in by hand.</summary>
    public bool IsForeignDelivery { get; set; }

    /// <summary>Foreign delivery (IsForeignDelivery): ISO 3166 alpha-2 code and name of the destination country.</summary>
    public string? DeliveryCountryCode { get; set; }

    public string? DeliveryCountryName { get; set; }

    /// <summary>"NovaPost" (a Nova Post branch, id in DeliveryWarehouseRef) or "Other" (a typed address). Null for Ukrainian orders.</summary>
    public string? DeliveryCarrier { get; set; }

    public string? DeliveryPostalCode { get; set; }

    /// <summary>The typed street, house and apartment of a foreign address delivery.</summary>
    public string? DeliveryAddress { get; set; }

    /// <summary>Set when the owner has seen the bank transfer arrive. A mark, not a status; only for orders paid by transfer.</summary>
    /// <summary>The currency the customer pays in: "EUR" for orders delivered abroad (to a euro IBAN), otherwise "UAH" (null on old orders). The accounting currency (CurrencyCode) and TotalCents stay hryvnia either way.</summary>
    public string? PaymentCurrency { get; set; }

    /// <summary>For a EUR order: the total in euro cents, a snapshot of the per-product € prices taken when it was placed.</summary>
    public long? EurTotalCents { get; set; }

    /// <summary>When the customer pressed "I have paid" (with the receipt attached). One claim per order; the admin's reset reopens it.</summary>
    public DateTime? PaymentClaimedAt { get; set; }

    public DateTime? PaymentReceivedAt { get; set; }

    /// <summary>When the signed-in customer asked to see photos of the order being made.</summary>
    public DateTime? PhotosRequestedAt { get; set; }

    /// <summary>When the customer was emailed that the photos are ready (once per order).</summary>
    public DateTime? PhotosNotifiedAt { get; set; }

    public virtual ICollection<OrderMakingPhoto> MakingPhotos { get; set; } = new List<OrderMakingPhoto>();

    /// <summary>Private storage key of the receipt image the customer uploaded; never a public URL. Cleared when the file is deleted.</summary>
    public string? ReceiptKey { get; set; }

    public string? ReceiptContentType { get; set; }

    public DateTime? ReceiptUploadedAt { get; set; }

    /// <summary>When the order became Received or Canceled: receipt files are deleted 30 days later.</summary>
    public DateTime? FinalizedAt { get; set; }

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
