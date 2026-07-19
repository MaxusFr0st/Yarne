using System;
using System.Collections.Generic;
using YarneAPIBack.Accounting.Models;

namespace YarneAPIBack.Models;

public partial class Order
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public int PaymentMethodId { get; set; }

    public int? ShippingAddrId { get; set; }

    public long TotalCents { get; set; }

    public int? ChannelId { get; set; }

    public long ChannelFeeCents { get; set; }

    public bool IsChannelFeeOverridden { get; set; }

    public string CurrencyCode { get; set; } = "UAH";

    public decimal ExchangeRateToBase { get; set; } = 1m;

    public string Status { get; set; } = null!;

    public DateTime OrderDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? EstimatedDelivery { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool IsVoid { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual PaymentMethod PaymentMethod { get; set; } = null!;

    public virtual CustomerAddress? ShippingAddr { get; set; }

    public virtual SalesChannel? Channel { get; set; }

    public virtual AccountingCurrency Currency { get; set; } = null!;

    public virtual ICollection<ReturnOrder> ReturnOrders { get; set; } = new List<ReturnOrder>();
}
