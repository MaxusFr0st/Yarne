import { useMemo } from "react";
import type { CartItem } from "../context/AppContext";
import { useProducts } from "./useProducts";

/**
 * Bag lines the shop no longer sells: the product was switched off or deleted in admin, or its
 * colour was removed, while the line sat in the visitor's bag. The bag and checkout grey them out
 * and hold the order until they are removed, instead of the server refusing it at the very end.
 *
 * Decided only from a real answer of the product list. While it loads, or when it failed, every
 * line counts as available, so a slow connection never marks a good bag as broken.
 */
export function useUnavailableCartLines(items: CartItem[]): Set<string> {
  const { products, fromApi } = useProducts();
  return useMemo(() => {
    const gone = new Set<string>();
    if (!fromApi || products.length === 0) return gone;
    const byId = new Map(products.map((product) => [product.id, product]));
    for (const item of items) {
      // Very old bags kept the numeric id; the server still resolves those, so they are left alone.
      if (/^\d+$/.test(item.productId)) continue;
      const product = byId.get(item.productId);
      const colourGone =
        product && item.colorId != null && product.colors.some((c) => c.colorId != null) &&
        !product.colors.some((c) => c.colorId === item.colorId);
      if (!product || colourGone) gone.add(item.cartId);
    }
    return gone;
  }, [items, products, fromApi]);
}
