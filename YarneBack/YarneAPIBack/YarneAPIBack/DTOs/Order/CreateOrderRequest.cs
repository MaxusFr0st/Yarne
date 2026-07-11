using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Order;

public class CreateOrderRequest
{
    [Required]
    [MinLength(1)]
    public List<CreateOrderItemRequest> Items { get; set; } = [];

    public int? PaymentMethodId { get; set; }

    public int? ShippingAddrId { get; set; }

    [Required]
    [StringLength(32, MinimumLength = 8)]
    public string PhoneNumber { get; set; } = string.Empty;
}
