import type { ColorVariant, LaceSizeVariant } from "../types/product";
import type { LaceSizeVariantDto } from "../api/products";

function normalizeLaceSizeVariant(raw: LaceSizeVariantDto | LaceSizeVariant): LaceSizeVariant {
  const anyRaw = raw as LaceSizeVariantDto & {
    WithLaceImages?: string[];
    WithoutLaceImages?: string[];
    WithLaceStock?: number;
    WithoutLaceStock?: number;
  };
  return {
    withLaceImages: anyRaw.withLaceImages ?? anyRaw.WithLaceImages ?? [],
    withoutLaceImages: anyRaw.withoutLaceImages ?? anyRaw.WithoutLaceImages ?? [],
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
