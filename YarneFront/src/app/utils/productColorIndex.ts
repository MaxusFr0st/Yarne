import type { Product } from "../types/product";

/** Index of the color shown first on cards and PDP (matches API defaultColor / sort order). */
export function getDefaultColorIndex(
  product: Pick<Product, "colors" | "defaultColor">,
  /** Color name carried over from a card the shopper already chose on (?color=). */
  requestedName?: string | null,
): number {
  // The choice the shopper made on the card wins over the product's own default — but only if
  // that color still exists, so an old link or a renamed color falls back instead of breaking.
  if (requestedName) {
    const idx = product.colors.findIndex((c) => c.name === requestedName);
    if (idx >= 0) return idx;
  }
  if (product.defaultColor) {
    const idx = product.colors.findIndex((c) => c.name === product.defaultColor);
    if (idx >= 0) return idx;
  }
  return 0;
}

/** Index of the furniture/hardware color selected by default on PDP. */
export function getDefaultFurnitureColorIndex(
  product: Pick<Product, "furnitureColors" | "defaultFurnitureColor">,
): number {
  const list = product.furnitureColors ?? [];
  if (product.defaultFurnitureColor) {
    const idx = list.findIndex((c) => c.name === product.defaultFurnitureColor);
    if (idx >= 0) return idx;
  }
  return 0;
}
