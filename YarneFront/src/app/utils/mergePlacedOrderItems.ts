import type { OrderDto } from "../api/orders";
import type { CartItem } from "../context/AppContext";

/** Keep cart images while preferring API variant fields after checkout. */
export function mergePlacedOrderDisplay(
  order: OrderDto,
  snapshot: CartItem[],
): CartItem[] {
  return order.items.map((apiItem) => {
    const snap =
      snapshot.find((s) => s.productId === apiItem.productCode) ??
      snapshot.find((s) => s.name === apiItem.productName);

    return {
      cartId: `placed-${apiItem.id}`,
      productId: apiItem.productCode,
      name: apiItem.productName,
      subtitle: apiItem.productSubtitle ?? snap?.subtitle,
      price: Number(apiItem.unitPrice),
      color: apiItem.colorName ?? snap?.color ?? "",
      colorHex: snap?.colorHex ?? "#2D241E",
      size: apiItem.sizeName ?? snap?.size ?? "",
      withLace: apiItem.withLace ?? snap?.withLace ?? null,
      quantity: apiItem.quantity,
      image: snap?.image ?? apiItem.productImageUrl ?? "",
      maxQuantity: apiItem.quantity,
    };
  });
}

export function cartItemsTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
