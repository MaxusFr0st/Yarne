import type { Product } from "../types/product";
import { resolveMediaUrl } from "./storefrontMedia";

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3Cpath fill='%232D241E' fill-opacity='0.3' d='M80 200h240M200 80v240' stroke='%232D241E' stroke-opacity='0.2'/%3E%3C/svg%3E";

/** First displayable product thumbnail, with /uploads paths resolved against the API host. */
export function getProductPreviewUrl(product: Pick<Product, "colors">): string {
  for (const color of product.colors ?? []) {
    const candidates = [
      ...(color.images ?? []).map((img) => img.src),
      color.image?.src,
    ].filter((url): url is string => Boolean(url?.trim()));

    for (const raw of candidates) {
      const resolved = resolveMediaUrl(raw);
      if (resolved) return resolved;
    }
  }

  return PLACEHOLDER;
}
