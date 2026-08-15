import type { ColorVariant, LaceSizeVariant, ProductImage } from "../types/product";
import type { LaceSizeVariantDto, ProductImageDto } from "../api/products";

function toProductImages(dtos: ProductImageDto[] | undefined | null): ProductImage[] {
  if (!dtos?.length) return [];
  return dtos
    .filter((d) => d?.src?.trim())
    .map((d) => ({ src: d.src, focalX: d.focalX ?? 0.5, focalY: d.focalY ?? 0.35 }));
}

function normalizeLaceSizeVariant(raw: LaceSizeVariantDto | LaceSizeVariant): LaceSizeVariant {
  const anyRaw = raw as LaceSizeVariantDto & {
    WithLaceImages?: ProductImageDto[];
    WithoutLaceImages?: ProductImageDto[];
  };
  return {
    withLaceImages: toProductImages(anyRaw.withLaceImages ?? anyRaw.WithLaceImages),
    withoutLaceImages: toProductImages(anyRaw.withoutLaceImages ?? anyRaw.WithoutLaceImages),
  };
}

export function normalizeLaceVariants(
  raw?: Record<string, LaceSizeVariantDto | LaceSizeVariant>
): Record<string, LaceSizeVariant> {
  if (!raw) return {};
  return Object.fromEntries(
    Object.entries(raw).map(([size, variant]) => [size, normalizeLaceSizeVariant(variant)])
  );
}

/**
 * Price for selected color + lace.
 * Matches server order pricing: lace → priceWithLace ?? price ?? base; else price ?? base.
 */
export function resolveDisplayPrice(
  color: ColorVariant | undefined,
  activeLace: boolean,
  basePrice: number
): number {
  if (!color) return basePrice;
  if (activeLace) {
    if (color.priceWithLace != null) return color.priceWithLace;
    if (color.price != null) return color.price;
    return basePrice;
  }
  if (color.price != null) return color.price;
  return basePrice;
}

/**
 * The admin form has no standalone base-price field — every color sets its own price.
 * This derives the product's fallback Price (used when a color has none set): the
 * default color's price, the first selected color that has one, or `existingPrice`
 * (the product's current price, when editing one that predates per-color pricing) —
 * so saving an unrelated change on an existing product doesn't demand every color
 * be re-priced first.
 */
export function deriveBasePrice(
  colorIds: number[],
  defaultColorId: number | null,
  colorPrices: Record<number, string>,
  existingPrice = 0
): number {
  const raw =
    (defaultColorId != null ? colorPrices[defaultColorId] : undefined) ??
    colorIds.map((id) => colorPrices[id]).find((v) => v && v.trim());
  const parsed = raw ? parseFloat(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : existingPrice;
}
