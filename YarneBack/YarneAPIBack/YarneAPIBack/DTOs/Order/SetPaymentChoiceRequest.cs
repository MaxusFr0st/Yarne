using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Order;

public class SetPaymentChoiceRequest
{
    /// <summary>"transfer" (to the card) or "pickup" (paid to Nova Poshta on collection).</summary>
    [Required]
    [StringLength(16)]
    public string Choice { get; set; } = null!;
}
