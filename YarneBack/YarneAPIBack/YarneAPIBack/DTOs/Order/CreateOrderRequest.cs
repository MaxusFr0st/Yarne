using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Order;

public class CreateOrderRequest
{
    [Required]
    [MinLength(1)]
    public List<CreateOrderItemRequest> Items { get; set; } = [];

    /// <summary>Storefront UI language at checkout ("en"/"uk"). Anything else is ignored — the order just falls back to hryvnia-only emails.</summary>
    public string? Locale { get; set; }

    /// <summary>Random id the checkout page makes once per order attempt (16 to 64 of A-Z a-z 0-9 _ -). Pressing Place order again with the same id returns the order already created instead of making another.</summary>
    [StringLength(64)]
    public string? ClientRequestId { get; set; }

    public int? PaymentMethodId { get; set; }

    public int? ShippingAddrId { get; set; }

    [Required]
    [StringLength(32, MinimumLength = 8)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>Required for guest checkout (no logged-in customer). Ignored when logged in.</summary>
    [EmailAddress]
    [StringLength(320)]
    public string? Email { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string RecipientFirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string RecipientLastName { get; set; } = string.Empty;

    [Required]
    [StringLength(32, MinimumLength = 8)]
    public string RecipientPhone { get; set; } = string.Empty;

    // Ukrainian orders need all four (the controller checks); foreign ones may leave the refs and the branch name empty.
    [StringLength(64)]
    public string DeliveryCityRef { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string DeliveryCityName { get; set; } = string.Empty;

    [StringLength(64)]
    public string DeliveryWarehouseRef { get; set; } = string.Empty;

    [StringLength(500)]
    public string DeliveryWarehouseName { get; set; } = string.Empty;

    /// <summary>Delivery abroad: no Nova Poshta (Ukraine) validation, no automatic waybill, payment by transfer only.</summary>
    public bool IsForeignDelivery { get; set; }

    [StringLength(2)]
    public string? DeliveryCountryCode { get; set; }

    [StringLength(100)]
    public string? DeliveryCountryName { get; set; }

    /// <summary>"NovaPost" (branch id in DeliveryWarehouseRef, its description in DeliveryWarehouseName) or "Other" (typed address).</summary>
    [StringLength(16)]
    public string? DeliveryCarrier { get; set; }

    [StringLength(20)]
    public string? DeliveryPostalCode { get; set; }

    [StringLength(500)]
    public string? DeliveryAddress { get; set; }
}
