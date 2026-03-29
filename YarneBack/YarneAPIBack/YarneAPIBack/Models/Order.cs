using System;
using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class Order
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public int PaymentMethodId { get; set; }

    public int? ShippingAddrId { get; set; }

    public decimal Total { get; set; }

    public string Status { get; set; } = null!;

    public DateTime OrderDate { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual PaymentMethod PaymentMethod { get; set; } = null!;

    public virtual CustomerAddress? ShippingAddr { get; set; }
}
