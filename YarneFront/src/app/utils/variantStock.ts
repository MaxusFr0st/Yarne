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
    WithLaceStock?: number;
    WithoutLaceStock?: number;
  };
  return {
    withLaceImages: toProductImages(anyRaw.withLaceImages ?? anyRaw.WithLaceImages),
    withoutLaceImages: toProductImages(anyRaw.withoutLaceImages ?? anyRaw.WithoutLaceImages),
    withLaceStock: Number(anyRaw.withLaceStock ?? anyRaw.WithLaceStock ?? 0),
    withoutLaceStock: Number(anyRaw.withoutLaceStock ?? anyRaw.WithoutLaceStock ?? 0),
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

export function colorHasVariantStockData(color?: ColorVariant): boolean {
  if (!color) return false;
  return (
    Object.keys(color.laceVariants ?? {}).length > 0 ||
    Object.keys(color.sizeStocks ?? {}).length > 0
  );
}

/** Stock for selected color + size + lace; never falls back to general when variant data exists. */
export function resolveDisplayStock(
  color: ColorVariant | undefined,
  activeSize: string | null,
  activeLace: boolean,
  generalStock?: number
): number {
  if (!color || !activeSize) {
    return colorHasVariantStockData(color) ? 0 : (generalStock ?? 0);
  }

  const laceVariant = color.laceVariants?.[activeSize];
  if (laceVariant) {
    return activeLace ? laceVariant.withLaceStock : laceVariant.withoutLaceStock;
  }

  if (color.sizeStocks && activeSize in color.sizeStocks) {
    return color.sizeStocks[activeSize] ?? 0;
  }

  if (colorHasVariantStockData(color)) {
    return 0;
  }

  return generalStock ?? 0;
}

/** Price for selected color + lace; falls back to the product's base price when the color has none set. */
export function resolveDisplayPrice(
  color: ColorVariant | undefined,
  activeLace: boolean,
  basePrice: number
): number {
  if (!color) return basePrice;
  if (activeLace && color.priceWithLace != null) return color.priceWithLace;
  if (!activeLace && color.price != null) return color.price;
  return basePrice;
}

/**
 * The admin form has no standalone base-price field — every color sets its own price.
 * This derives the product's fallback Price (used when a color has none set): the
 * default color's price, or the first selected color that has one, or 0 if none do.
 */
export function deriveBasePrice(
  colorIds: number[],
  defaultColorId: number | null,
  colorPrices: Record<number, string>
): number {
  const raw =
    (defaultColorId != null ? colorPrices[defaultColorId] : undefined) ??
    colorIds.map((id) => colorPrices[id]).find((v) => v && v.trim());
  const parsed = raw ? parseFloat(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
