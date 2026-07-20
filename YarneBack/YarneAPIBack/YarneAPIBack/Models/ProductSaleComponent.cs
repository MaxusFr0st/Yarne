using System;

namespace YarneAPIBack.Models;

/// <summary>
/// A sale-time composition rule: when the base <see cref="Product"/> is sold, the referenced
/// <see cref="ComponentProduct"/> is added as a separate order line (its own FIFO / pooled stock
/// decrement and COGS). Condition controls when the component is included:
/// <list type="bullet">
///   <item><c>"with_lace"</c> — only when the sale line opted into the lace toggle.</item>
///   <item><c>"always"</c> — on every sale of the base (reserved for packaging, added later).</item>
/// </list>
/// </summary>
public class ProductSaleComponent
{
    public int Id { get; set; }

    /// <summary>The base/storefront product (e.g. "Cherie").</summary>
    public int ProductId { get; set; }

    /// <summary>The internal component product consumed on sale (e.g. "Lace").</summary>
    public int ComponentProductId { get; set; }

    /// <summary>Units of the component consumed per 1 unit of the base sold.</summary>
    public int Quantity { get; set; } = 1;

    /// <summary>"with_lace" | "always".</summary>
    public string Condition { get; set; } = "with_lace";

    /// <summary>
    /// For <c>"with_lace"</c> rows, the lace color this row represents (shared <see cref="Color"/>
    /// table also used for bag colors). Null for legacy/un-migrated rows and always null for
    /// <c>"always"</c> (packaging) rows.
    /// </summary>
    public int? ColorId { get; set; }

    public bool IsVoid { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Product ComponentProduct { get; set; } = null!;

    public virtual Color? Color { get; set; }
}
