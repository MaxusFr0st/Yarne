import type { Product } from "../types/product";
import { productMaterial } from "./productText";

/**
 * The grey line under a product's name. It is the material unless the product has a subtitle of its own
 * (or only a maker), so the English material is swapped in only where the Ukrainian one was being shown.
 */
export function productSubtitle(
  p: Pick<Product, "name" | "description" | "category" | "subtitle" | "material" | "materialEn">,
  locale: string,
): string {
  return p.material && p.subtitle === p.material ? productMaterial(p, locale) : p.subtitle;
}
