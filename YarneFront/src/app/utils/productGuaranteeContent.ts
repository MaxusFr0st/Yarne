import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import type { Locale } from "../i18n/config";

export const PRODUCT_GUARANTEE_CONTENT_KEY = "yarne.product.guarantee.v1";

export const DEFAULT_GUARANTEE_TITLE_EN = "Quality Guarantee";
export const DEFAULT_GUARANTEE_DESCRIPTION_EN =
  "We guarantee the quality of our products — if anything breaks, we'll fix it for free.";
export const DEFAULT_GUARANTEE_TITLE_UK = "Гарантія якості";
export const DEFAULT_GUARANTEE_DESCRIPTION_UK =
  "Ми гарантуємо якість наших виробів — якщо щось зламається, ми безкоштовно відремонтуємо.";

export type ProductGuaranteeContent = {
  titleEn: string;
  descriptionEn: string;
  titleUk: string;
  descriptionUk: string;
};

function normalizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  const text = trimmed.length > 0 ? trimmed : fallback;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

export function normalizeProductGuaranteeContent(value: unknown): ProductGuaranteeContent {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    titleEn: normalizeText(source.titleEn, DEFAULT_GUARANTEE_TITLE_EN, 120),
    descriptionEn: normalizeText(source.descriptionEn, DEFAULT_GUARANTEE_DESCRIPTION_EN, 2000),
    titleUk: normalizeText(source.titleUk, DEFAULT_GUARANTEE_TITLE_UK, 120),
    descriptionUk: normalizeText(source.descriptionUk, DEFAULT_GUARANTEE_DESCRIPTION_UK, 2000),
  };
}

export function getDefaultProductGuaranteeContent(): ProductGuaranteeContent {
  return normalizeProductGuaranteeContent({});
}

function readLocalProductGuarantee(): ProductGuaranteeContent {
  if (typeof window === "undefined") return getDefaultProductGuaranteeContent();
  const raw = window.localStorage.getItem(PRODUCT_GUARANTEE_CONTENT_KEY);
  if (raw == null) return getDefaultProductGuaranteeContent();
  try {
    return normalizeProductGuaranteeContent(JSON.parse(raw));
  } catch {
    return getDefaultProductGuaranteeContent();
  }
}

function writeLocalProductGuarantee(content: ProductGuaranteeContent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRODUCT_GUARANTEE_CONTENT_KEY, JSON.stringify(content));
}

function hasConfiguredProductGuarantee(content: ProductGuaranteeContent): boolean {
  return (
    content.titleEn !== DEFAULT_GUARANTEE_TITLE_EN
    || content.descriptionEn !== DEFAULT_GUARANTEE_DESCRIPTION_EN
    || content.titleUk !== DEFAULT_GUARANTEE_TITLE_UK
    || content.descriptionUk !== DEFAULT_GUARANTEE_DESCRIPTION_UK
  );
}

export function getProductGuaranteeContent(): ProductGuaranteeContent {
  return readLocalProductGuarantee();
}

export async function loadProductGuaranteeContent(): Promise<ProductGuaranteeContent> {
  try {
    const remote = await fetchStorefrontSetting<ProductGuaranteeContent>(PRODUCT_GUARANTEE_CONTENT_KEY);
    if (remote != null) {
      const normalized = normalizeProductGuaranteeContent(remote);
      writeLocalProductGuarantee(normalized);
      return normalized;
    }
  } catch {
    // API unavailable
  }
  return getDefaultProductGuaranteeContent();
}

export async function loadProductGuaranteeContentForAdmin(): Promise<ProductGuaranteeContent> {
  try {
    const remote = await fetchStorefrontSetting<ProductGuaranteeContent>(PRODUCT_GUARANTEE_CONTENT_KEY);
    if (remote != null) {
      const normalized = normalizeProductGuaranteeContent(remote);
      writeLocalProductGuarantee(normalized);
      return normalized;
    }
  } catch {
    // continue
  }

  const local = readLocalProductGuarantee();
  if (!hasConfiguredProductGuarantee(local)) {
    return getDefaultProductGuaranteeContent();
  }

  const normalized = normalizeProductGuaranteeContent(local);
  await saveStorefrontSetting(PRODUCT_GUARANTEE_CONTENT_KEY, normalized);
  writeLocalProductGuarantee(normalized);
  return normalized;
}

export async function persistProductGuaranteeContent(
  content: ProductGuaranteeContent
): Promise<ProductGuaranteeContent> {
  const normalized = normalizeProductGuaranteeContent(content);
  await saveStorefrontSetting(PRODUCT_GUARANTEE_CONTENT_KEY, normalized);
  writeLocalProductGuarantee(normalized);
  return normalized;
}

type GuaranteeFallback = {
  title: string;
  description: string;
};

export function resolveProductGuaranteeText(
  content: ProductGuaranteeContent,
  locale: Locale,
  fallback: GuaranteeFallback
): { title: string; description: string } {
  const isUk = locale === "uk";
  const title = isUk ? content.titleUk : content.titleEn;
  const description = isUk ? content.descriptionUk : content.descriptionEn;
  return {
    title: title || fallback.title,
    description: description || fallback.description,
  };
}
