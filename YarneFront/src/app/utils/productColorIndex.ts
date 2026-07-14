import type { Product } from "../types/product";

/** Index of the color shown first on cards and PDP (matches API defaultColor / sort order). */
export function getDefaultColorIndex(product: Pick<Product, "colors" | "defaultColor">): number {
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
