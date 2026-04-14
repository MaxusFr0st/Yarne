using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Order;

public class UpdateOrderStatusRequest
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    public string Status { get; set; } = null!;

    public DateTime? EstimatedDelivery { get; set; }
}
