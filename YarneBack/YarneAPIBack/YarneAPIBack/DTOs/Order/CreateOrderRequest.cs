using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Order;

public class CreateOrderRequest
{
    [Required]
    [MinLength(1)]
    public List<CreateOrderItemRequest> Items { get; set; } = [];

    /// <summary>Storefront UI language at checkout ("en"/"uk"). Anything else is ignored — the order just falls back to hryvnia-only emails.</summary>
    public string? Locale { get; set; }

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

    [Required]
    [StringLength(64, MinimumLength = 1)]
    public string DeliveryCityRef { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string DeliveryCityName { get; set; } = string.Empty;

    [Required]
    [StringLength(64, MinimumLength = 1)]
    public string DeliveryWarehouseRef { get; set; } = string.Empty;

    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string DeliveryWarehouseName { get; set; } = string.Empty;
}
