using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Order;

public class CreateOrderRequest
{
    /// <summary>
    /// Set by the client when an order is queued offline, before any network attempt —
    /// generated once (crypto.randomUUID()) and reused across every retry/reconnect. Lets
    /// CreateOrderCore recognise a retried submission as the same attempt and return the
    /// existing order instead of creating a duplicate. Null for a normal online checkout,
    /// which never needs retry-safety in the first place.
    /// </summary>
    public Guid? ClientOrderId { get; set; }

    [Required]
    [MinLength(1)]
    public List<CreateOrderItemRequest> Items { get; set; } = [];

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
