import type { ColorVariant, Product, ProductImage } from "../types/product";

/** Gallery for selected color + size + lace — never mixes with/without lace sets. */
export function resolveDisplayImages(
  product: Product,
  color: ColorVariant | undefined,
  activeSize: string | null,
  activeLace: boolean,
): ProductImage[] {
  if (!color) return [];

  const laceVariant = activeSize ? color.laceVariants?.[activeSize] : undefined;

  if (product.lace === true) {
    if (laceVariant) {
      const scoped = activeLace ? laceVariant.withLaceImages : laceVariant.withoutLaceImages;
      return (scoped ?? []).filter((img) => img?.src?.trim());
    }
    if (activeSize) {
      const sizeOnly = color.sizeImages?.[activeSize] ?? [];
      if (sizeOnly.length) return sizeOnly;
    }
    return [];
  }

  if (activeSize) {
    const sizeImages = color.sizeImages?.[activeSize] ?? [];
    if (sizeImages.length) return sizeImages;
  }
  if (color.images?.length) return color.images;
  return color.image ? [color.image] : [];
}
