import type { CartItem } from "../context/AppContext";
import type { ColorVariant, FurnitureColorVariant, Product } from "../types/product";
import { resolveDisplayImages } from "./variantImages";
import { resolveDisplayEurPrice, resolveDisplayPrice } from "./variantStock";

/** The sizes the product page offers for a colour: the ones that colour has photos for, else the product's own. */
export function displaySizesFor(product: Product, color: ColorVariant | undefined): string[] {
  const colorScoped = Array.from(
    new Set([...Object.keys(color?.sizeImages ?? {}), ...Object.keys(color?.laceVariants ?? {})]),
  );
  return colorScoped.length > 0 ? colorScoped : (product.sizes ?? []).map((s) => s.name);
}

/**
 * The bag line for one choice of colour, size, strap and hardware colour. The product page and the
 * collection card's quick add both build it here, so the same choice is always the same line (and
 * merges into one line with quantity 2 in the cart).
 */
export function buildCartLine({
  product,
  color,
  size,
  withLace,
  furniture,
  image,
}: {
  product: Product;
  color: ColorVariant;
  size: string;
  withLace: boolean;
  /** Only when the hardware colour applies to this choice (a strap-less bag has none to pick). */
  furniture?: FurnitureColorVariant;
  image?: string;
}): Omit<CartItem, "cartId"> {
  return {
    productId: product.id,
    name: product.name,
    subtitle: product.subtitle,
    price: resolveDisplayPrice(color, withLace, product.price),
    eurPrice: resolveDisplayEurPrice(color, withLace, product.eurPrice) ?? undefined,
    color: color.name,
    colorId: color.colorId,
    colorHex: color.hex,
    colorUk: color.nameUk,
    furnitureColor: furniture?.name,
    furnitureColorHex: furniture?.hex,
    furnitureColorUk: furniture?.nameUk,
    size,
    sizeUk: product.sizes.find((s) => s.name === size)?.nameUk,
    withLace: product.lace ? withLace : null,
    quantity: 1,
    image: image ?? color.image.src,
  };
}

/**
 * What quick add puts in the bag, or null when the shopper has a choice to make first: a size, a
 * strap, or a hardware colour. Then the product page has to ask, because guessing would make the
 * wrong piece.
 */
export function quickAddLine(product: Product, color: ColorVariant | undefined): Omit<CartItem, "cartId"> | null {
  if (!color) return null;
  const sizes = displaySizesFor(product, color);
  const furnitureColors = product.furnitureColors ?? [];
  if (sizes.length !== 1 || product.lace === true || furnitureColors.length > 1) return null;

  const size = sizes[0];
  // A single hardware colour is not a choice, but the product page records it, so this does too.
  return buildCartLine({
    product,
    color,
    size,
    withLace: false,
    furniture: furnitureColors[0],
    image: resolveDisplayImages(product, color, size, false)[0]?.src,
  });
}
