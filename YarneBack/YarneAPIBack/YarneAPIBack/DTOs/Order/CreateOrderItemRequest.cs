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

    [StringLength(200)]
    public string? ProductSubtitle { get; set; }

    [StringLength(100)]
    public string? ColorName { get; set; }

    [StringLength(100)]
    public string? FurnitureColorName { get; set; }

    [StringLength(20)]
    public string? SizeName { get; set; }

    public bool? WithLace { get; set; }
}
