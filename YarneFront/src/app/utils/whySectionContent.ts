import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import type { Locale } from "../i18n/config";
import en from "../i18n/locales/en";
import uk from "../i18n/locales/uk";

export const WHY_SECTION_KEY = "yarne.why.v1";

export type WhyItem = {
  caption: string;
  factTitle: string;
  factBody: string;
};

export type WhySectionLocale = {
  eyebrow: string;
  titleLine1: string;
  titleAccent: string;
  items: [WhyItem, WhyItem, WhyItem];
};

export type WhySectionContent = {
  /** Custom bag photo uploads; empty string keeps the built-in default photo for that slot. */
  images: [string, string, string];
  en: WhySectionLocale;
  uk: WhySectionLocale;
};

function pickLocale(home: typeof en.home): WhySectionLocale {
  const items = home.why.facts.map((fact, i) => ({
    caption: home.why.captions[i] ?? "",
    factTitle: fact.title,
    factBody: fact.body,
  })) as [WhyItem, WhyItem, WhyItem];
  return {
    eyebrow: home.why.eyebrow,
    titleLine1: home.why.titleLine1,
    titleAccent: home.why.titleAccent,
    items,
  };
}

export const DEFAULT_WHY_SECTION_CONTENT: WhySectionContent = {
  images: ["", "", ""],
  en: pickLocale(en.home),
  uk: pickLocale(uk.home),
};

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeItem(value: unknown, fallback: WhyItem): WhyItem {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    caption: normalizeString(source.caption, fallback.caption),
    factTitle: normalizeString(source.factTitle, fallback.factTitle),
    factBody: normalizeString(source.factBody, fallback.factBody),
  };
}

function normalizeLocale(value: unknown, fallback: WhySectionLocale): WhySectionLocale {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    eyebrow: normalizeString(source.eyebrow, fallback.eyebrow),
    titleLine1: normalizeString(source.titleLine1, fallback.titleLine1),
    titleAccent: normalizeString(source.titleAccent, fallback.titleAccent),
    items: [
      normalizeItem(items[0], fallback.items[0]),
      normalizeItem(items[1], fallback.items[1]),
      normalizeItem(items[2], fallback.items[2]),
    ],
  };
}

export function normalizeWhySectionContent(value: unknown): WhySectionContent {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const images = Array.isArray(source.images) ? source.images : [];
  return {
    images: [
      normalizeString(images[0], ""),
      normalizeString(images[1], ""),
      normalizeString(images[2], ""),
    ],
    en: normalizeLocale(source.en, DEFAULT_WHY_SECTION_CONTENT.en),
    uk: normalizeLocale(source.uk, DEFAULT_WHY_SECTION_CONTENT.uk),
  };
}

export function getDefaultWhySectionContent(): WhySectionContent {
  return normalizeWhySectionContent({});
}

export async function loadWhySectionContent(): Promise<WhySectionContent> {
  try {
    const remote = await fetchStorefrontSetting<WhySectionContent>(WHY_SECTION_KEY);
    if (remote != null) return normalizeWhySectionContent(remote);
  } catch {
    // API unavailable
  }
  return getDefaultWhySectionContent();
}

export async function loadWhySectionContentForAdmin(): Promise<WhySectionContent> {
  return loadWhySectionContent();
}

export async function persistWhySectionContent(content: WhySectionContent): Promise<WhySectionContent> {
  const normalized = normalizeWhySectionContent(content);
  await saveStorefrontSetting(WHY_SECTION_KEY, normalized);
  return normalized;
}

export function getWhySectionForLocale(content: WhySectionContent, locale: Locale): WhySectionLocale {
  return content[locale];
}
