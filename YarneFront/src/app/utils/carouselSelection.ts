const CAROUSEL_PRODUCT_CODES_KEY = "yarne.carousel.productCodes.v1";

function normalizeCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  const onlyStrings = codes.filter((code): code is string => typeof code === "string");
  return Array.from(new Set(onlyStrings));
}

export function getCarouselSelection(): { configured: boolean; productCodes: string[] } {
  if (typeof window === "undefined") {
    return { configured: false, productCodes: [] };
  }

  const raw = window.localStorage.getItem(CAROUSEL_PRODUCT_CODES_KEY);
  if (raw == null) {
    return { configured: false, productCodes: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return { configured: true, productCodes: normalizeCodes(parsed) };
  } catch {
    return { configured: true, productCodes: [] };
  }
}

export function saveCarouselSelection(productCodes: string[]): string[] {
  const normalized = normalizeCodes(productCodes);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CAROUSEL_PRODUCT_CODES_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
