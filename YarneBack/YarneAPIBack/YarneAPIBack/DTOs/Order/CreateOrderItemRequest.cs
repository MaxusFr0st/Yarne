using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Order;

public class CreateOrderItemRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string ProductIdOrCode { get; set; } = null!;

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    public int? CountryId { get; set; }
}
