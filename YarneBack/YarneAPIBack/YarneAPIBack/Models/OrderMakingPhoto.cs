namespace YarneAPIBack.Models;

/// <summary>A photo of an order being made, uploaded by the owner for the customer. Private storage; deleted when the order is Received or Canceled.</summary>
public class OrderMakingPhoto
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    /// <summary>Private storage key (making/{orderId}-{guid}.ext); never a public URL.</summary>
    public string StorageKey { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public virtual Order Order { get; set; } = null!;
}
