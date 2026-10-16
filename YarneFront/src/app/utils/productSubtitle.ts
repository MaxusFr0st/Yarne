import type { Product } from "../types/product";
import { productCategory, productMaterial } from "./productText";

/**
 * The grey line under a product's name. It is the material unless the product has a subtitle of its own
 * (or only a maker), so the English material is swapped in only where the Ukrainian one was being shown.
 * Suggested products ("You may also like") carry their category there instead, swapped the same way.
 */
export function productSubtitle(
  p: Pick<Product, "name" | "description" | "category" | "categoryEn" | "subtitle" | "material" | "materialEn">,
  locale: string,
): string {
  if (p.material && p.subtitle === p.material) return productMaterial(p, locale);
  if (p.category && p.subtitle === p.category) return productCategory(p, locale);
  return p.subtitle;
}
