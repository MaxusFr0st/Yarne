import type { ColorVariant, Product } from "../types/product";
import { getDefaultColorIndex } from "./productColorIndex";
import { resolveDisplayImages } from "./variantImages";

/** Sizes the product page offers for a colour, in its order (pages/ProductDetail.tsx). */
function sizesOf(color: ColorVariant): string[] {
  return Array.from(new Set([...Object.keys(color.sizeImages ?? {}), ...Object.keys(color.laceVariants ?? {})]));
}

/** The gallery the product page shows for a colour when it opens: its first size, no lace. */
function openingGallery(product: Product, color: ColorVariant): string[] {
  return resolveDisplayImages(product, color, sizesOf(color)[0] ?? null, false).map((img) => img.src);
}

/** The photo a card shows: the default colour's. */
export function defaultPhoto(product: Product): string | undefined {
  return product.colors[getDefaultColorIndex(product)]?.image.src;
}

/**
 * One tap away from a card: the product page as it opens (its default colour's gallery; the
 * first photo is the card's own) and the other colours' card photos, for swatch taps.
 */
export function oneTapPhotos(product: Product): string[] {
  const color = product.colors[getDefaultColorIndex(product)];
  return [...(color ? openingGallery(product, color) : []), ...product.colors.map((c) => c.image.src)];
}

/**
 * Every photo of a product, nearest first, for the product page the visitor is on:
 * [first photo of every colour and every size of the shown colour, then everything else].
 */
export function productPagePhotos(product: Product, colorIndex: number): [string[], string[]] {
  const shown = product.colors[colorIndex];
  const firsts = [
    ...product.colors.map((c) => openingGallery(product, c)[0] ?? c.image.src),
    ...(shown ? sizesOf(shown).map((size) => resolveDisplayImages(product, shown, size, false)[0]?.src) : []),
  ].filter((src): src is string => Boolean(src));
  return [firsts, allPhotos(product)];
}

/** Every photo a product has: each colour's card photo, gallery, size galleries and lace sets. */
export function allPhotos(product: Product): string[] {
  const out: string[] = [];
  for (const c of product.colors) {
    out.push(c.image.src, ...c.images.map((img) => img.src));
    for (const list of Object.values(c.sizeImages ?? {})) out.push(...list.map((img) => img.src));
    for (const lace of Object.values(c.laceVariants ?? {})) {
      out.push(...lace.withLaceImages.map((img) => img.src), ...lace.withoutLaceImages.map((img) => img.src));
    }
  }
  return out;
}
