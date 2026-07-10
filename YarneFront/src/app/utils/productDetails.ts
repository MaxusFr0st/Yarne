import type { Product } from "../types/product";

/** Supplementary detail lines for the Product Details accordion (excludes material/description). */
export function getSupplementaryProductDetails(product: Pick<Product, "details" | "producerName">): string[] {
  return product.details;
}

export function hasSupplementaryProductDetails(product: Pick<Product, "details" | "producerName">): boolean {
  return Boolean(product.producerName?.trim()) || product.details.length > 0;
}
