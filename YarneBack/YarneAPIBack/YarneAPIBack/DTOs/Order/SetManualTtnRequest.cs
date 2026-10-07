using System.ComponentModel.DataAnnotations;

namespace YarneAPIBack.DTOs.Order;

public class SetManualTtnRequest
{
    /// <summary>The tracking number typed in by hand; empty or null clears it.</summary>
    [StringLength(32)]
    public string? TtnNumber { get; set; }
}
