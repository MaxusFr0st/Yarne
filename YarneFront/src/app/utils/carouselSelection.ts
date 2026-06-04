import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";

export const CAROUSEL_PRODUCT_CODES_KEY = "yarne.carousel.productCodes.v1";

function normalizeCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  const onlyStrings = codes.filter((code): code is string => typeof code === "string");
  return Array.from(new Set(onlyStrings));
}

function readLocalCarousel(): { configured: boolean; productCodes: string[] } {
  if (typeof window === "undefined") {
    return { configured: false, productCodes: [] };
  }
  const raw = window.localStorage.getItem(CAROUSEL_PRODUCT_CODES_KEY);
  if (raw == null) return { configured: false, productCodes: [] };
  try {
    return { configured: true, productCodes: normalizeCodes(JSON.parse(raw)) };
  } catch {
    return { configured: true, productCodes: [] };
  }
}

function writeLocalCarousel(productCodes: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CAROUSEL_PRODUCT_CODES_KEY, JSON.stringify(productCodes));
}

export function getCarouselSelection(): { configured: boolean; productCodes: string[] } {
  return readLocalCarousel();
}

export async function loadCarouselSelection(): Promise<{ configured: boolean; productCodes: string[] }> {
  try {
    const remote = await fetchStorefrontSetting<string[]>(CAROUSEL_PRODUCT_CODES_KEY);
    if (remote != null) {
      const productCodes = normalizeCodes(remote);
      writeLocalCarousel(productCodes);
      return { configured: true, productCodes };
    }
  } catch {
    // API unavailable
  }
  return { configured: false, productCodes: [] };
}

export async function loadCarouselSelectionForAdmin(): Promise<{ configured: boolean; productCodes: string[] }> {
  try {
    const remote = await fetchStorefrontSetting<string[]>(CAROUSEL_PRODUCT_CODES_KEY);
    if (remote != null) {
      const productCodes = normalizeCodes(remote);
      writeLocalCarousel(productCodes);
      return { configured: true, productCodes };
    }
  } catch {
    // continue
  }

  const local = readLocalCarousel();
  if (!local.configured || local.productCodes.length === 0) {
    return { configured: false, productCodes: [] };
  }

  await saveStorefrontSetting(CAROUSEL_PRODUCT_CODES_KEY, local.productCodes);
  return local;
}

export async function persistCarouselSelection(productCodes: string[]): Promise<string[]> {
  const normalized = normalizeCodes(productCodes);
  await saveStorefrontSetting(CAROUSEL_PRODUCT_CODES_KEY, normalized);
  writeLocalCarousel(normalized);
  return normalized;
}
