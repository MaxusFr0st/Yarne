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

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/** Strip legacy auto-saved defaults so i18n remains the display fallback until admin sets text. */
export function stripPersistedGuaranteeDefaults(content: ProductGuaranteeContent): ProductGuaranteeContent {
  return {
    titleEn: content.titleEn === DEFAULT_GUARANTEE_TITLE_EN ? "" : content.titleEn,
    descriptionEn: content.descriptionEn === DEFAULT_GUARANTEE_DESCRIPTION_EN ? "" : content.descriptionEn,
    titleUk: content.titleUk === DEFAULT_GUARANTEE_TITLE_UK ? "" : content.titleUk,
    descriptionUk: content.descriptionUk === DEFAULT_GUARANTEE_DESCRIPTION_UK ? "" : content.descriptionUk,
  };
}

export function normalizeProductGuaranteeContent(value: unknown): ProductGuaranteeContent {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return stripPersistedGuaranteeDefaults({
    titleEn: normalizeText(source.titleEn, 120),
    descriptionEn: normalizeText(source.descriptionEn, 2000),
    titleUk: normalizeText(source.titleUk, 120),
    descriptionUk: normalizeText(source.descriptionUk, 2000),
  });
}

export function getEmptyProductGuaranteeContent(): ProductGuaranteeContent {
  return { titleEn: "", descriptionEn: "", titleUk: "", descriptionUk: "" };
}

/** @deprecated Use getEmptyProductGuaranteeContent for unconfigured state. */
export function getDefaultProductGuaranteeContent(): ProductGuaranteeContent {
  return getEmptyProductGuaranteeContent();
}

function readLocalProductGuarantee(): ProductGuaranteeContent {
  if (typeof window === "undefined") return getEmptyProductGuaranteeContent();
  const raw = window.localStorage.getItem(PRODUCT_GUARANTEE_CONTENT_KEY);
  if (raw == null) return getEmptyProductGuaranteeContent();
  try {
    return normalizeProductGuaranteeContent(JSON.parse(raw));
  } catch {
    return getEmptyProductGuaranteeContent();
  }
}

function writeLocalProductGuarantee(content: ProductGuaranteeContent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRODUCT_GUARANTEE_CONTENT_KEY, JSON.stringify(content));
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
  return getEmptyProductGuaranteeContent();
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

  return getEmptyProductGuaranteeContent();
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
    title: title.trim() || fallback.title,
    description: description.trim() || fallback.description,
  };
}
