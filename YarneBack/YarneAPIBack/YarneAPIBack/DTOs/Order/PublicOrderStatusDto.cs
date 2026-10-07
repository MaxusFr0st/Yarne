namespace YarneAPIBack.DTOs.Order;

/// <summary>
/// What the public status page (opened with the link token, no sign-in) may know about an order.
/// Deliberately has no phone number, no last name and no street data: only what the customer needs to follow the order.
/// </summary>
public class PublicOrderStatusDto
{
    public string? OrderNumber { get; set; }

    public DateTime OrderDate { get; set; }

    /// <summary>Stored status: Pending, Accepted, InProduction, Made, Shipped, Received or Canceled.</summary>
    public string Status { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = "UAH";

    public decimal Total { get; set; }

    /// <summary>Null unless every line has a EUR snapshot, like the order history.</summary>
    public decimal? EurTotal { get; set; }

    /// <summary>The language the order was placed in ("uk"/"en"), null for old orders.</summary>
    public string? Locale { get; set; }

    public string? RecipientFirstName { get; set; }

    public string? DeliveryCityName { get; set; }

    public string? DeliveryWarehouseName { get; set; }

    public string? TtnNumber { get; set; }

    public string? TrackingStatus { get; set; }

    public bool IsForeignDelivery { get; set; }

    public string? DeliveryCountryName { get; set; }

    /// <summary>"NovaPost" or "Other" for a foreign order.</summary>
    public string? DeliveryCarrier { get; set; }

    public string? DeliveryPostalCode { get; set; }

    public string? DeliveryAddress { get; set; }

    /// <summary>When the owner confirmed the bank transfer arrived.</summary>
    public DateTime? PaymentReceivedAt { get; set; }

    /// <summary>When the customer uploaded a receipt; null when none (or it has been deleted).</summary>
    public DateTime? ReceiptUploadedAt { get; set; }

    /// <summary>When the customer pressed "I have paid" with a receipt attached.</summary>
    public DateTime? PaymentClaimedAt { get; set; }

    /// <summary>"I have paid" is still open: the choice is Transfer, the order is not finished, and there is no claim or confirmation yet.</summary>
    public bool CanClaimPayment { get; set; }

    /// <summary>null, "Transfer" or "Pickup".</summary>
    public string? PaymentChoice { get; set; }

    public DateTime? PaymentChoiceAt { get; set; }

    /// <summary>The payment choice can be made or changed (the order is not shipped, received or canceled yet).</summary>
    public bool CanChoosePayment { get; set; }

    /// <summary>The owner's bank-transfer details, only while the choice is "Transfer". Null when the owner has not filled them in yet: details follow by email.</summary>
    public TransferDetailsDto? TransferDetails { get; set; }

    public string? CancelReason { get; set; }

    /// <summary>The email the order was placed with (the account's email once attached).</summary>
    public string? Email { get; set; }

    /// <summary>The order already belongs to a customer account.</summary>
    public bool IsAttachedToAccount { get; set; }

    /// <summary>A guest order whose email already has an account: the page offers "Sign in" instead of "Create account".</summary>
    public bool AccountExistsForEmail { get; set; }

    public List<PublicOrderStatusItemDto> Items { get; set; } = [];
}

public class PublicOrderStatusItemDto
{
    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string? ProductImageUrl { get; set; }

    public string? ColorName { get; set; }

    public string? ColorNameUk { get; set; }

    public string? SizeName { get; set; }

    public string? SizeNameUk { get; set; }

    public bool? WithLace { get; set; }

    public string? FurnitureColorName { get; set; }

    public string? FurnitureColorNameUk { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }

    public decimal? EurUnitPrice { get; set; }

    public decimal? EurLineTotal { get; set; }
}

public class TransferDetailsDto
{
    public string Recipient { get; set; } = string.Empty;

    public string CardNumber { get; set; } = string.Empty;

    /// <summary>Optional.</summary>
    public string Iban { get; set; } = string.Empty;

    /// <summary>What to write in the payment note ("призначення"): the owner's text with {{order}} replaced by this order's number.</summary>
    public string Reference { get; set; } = string.Empty;
}
