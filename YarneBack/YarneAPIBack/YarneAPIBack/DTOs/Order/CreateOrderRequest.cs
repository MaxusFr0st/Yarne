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
    [Phone]
    [MaxLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;
}
