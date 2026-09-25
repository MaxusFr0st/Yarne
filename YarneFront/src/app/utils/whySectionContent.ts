import { fetchStorefrontSetting, peekStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import type { Locale } from "../i18n/config";
import en from "../i18n/locales/en";
import uk from "../i18n/locales/uk";

// The storage key stays at v1: the backend whitelists keys, and everything a v1 save held
// (photos, per-bag copy) still means the same thing. Fields the redesign added simply fall
// back to their defaults until the admin saves.
export const WHY_SECTION_KEY = "yarne.why.v1";

export type WhyItem = {
  /** The large display name shown behind/beside the bag ("Femmora"). */
  word: string;
  /** Describes the bag photo for screen readers; not shown on screen. */
  caption: string;
  factTitle: string;
  factBody: string;
};

export type WhyCareItem = {
  title: string;
  body: string;
};

/** The closing "Yarné Care" step that follows the three bags. */
export type WhyCare = {
  word: string;
  title: string;
  items: [WhyCareItem, WhyCareItem, WhyCareItem];
  linkLabel: string;
};

export type WhySectionLocale = {
  /** Small uppercase line above the big display word. */
  heading: string;
  items: [WhyItem, WhyItem, WhyItem];
  care: WhyCare;
};

export type WhySectionContent = {
  /** Custom bag photo uploads; empty string keeps the built-in default photo for that slot. */
  images: [string, string, string];
  /** Painted scene behind each bag; empty string means no scene for that slot. */
  backgrounds: [string, string, string];
  /** Product each bag links to (its id); empty string means the bag is not a link. */
  productCodes: [string, string, string];
  en: WhySectionLocale;
  uk: WhySectionLocale;
};

function pickLocale(home: typeof en.home): WhySectionLocale {
  const why = home.why;
  const items = why.items.map((item) => ({
    word: item.word,
    caption: item.caption,
    factTitle: item.title,
    factBody: item.body,
  })) as [WhyItem, WhyItem, WhyItem];
  return {
    heading: why.heading,
    items,
    care: {
      word: why.care.word,
      title: why.care.title,
      items: why.care.items.map((item) => ({ ...item })) as WhyCare["items"],
      linkLabel: why.care.linkLabel,
    },
  };
}

export const DEFAULT_WHY_SECTION_CONTENT: WhySectionContent = {
  images: ["", "", ""],
  backgrounds: ["", "", ""],
  productCodes: ["", "", ""],
  en: pickLocale(en.home),
  uk: pickLocale(uk.home),
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeItem(value: unknown, fallback: WhyItem): WhyItem {
  const source = asRecord(value);
  return {
    word: normalizeString(source.word, fallback.word),
    caption: normalizeString(source.caption, fallback.caption),
    factTitle: normalizeString(source.factTitle, fallback.factTitle),
    factBody: normalizeString(source.factBody, fallback.factBody),
  };
}

function normalizeCareItem(value: unknown, fallback: WhyCareItem): WhyCareItem {
  const source = asRecord(value);
  return {
    title: normalizeString(source.title, fallback.title),
    body: normalizeString(source.body, fallback.body),
  };
}

function normalizeCare(value: unknown, fallback: WhyCare): WhyCare {
  const source = asRecord(value);
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    word: normalizeString(source.word, fallback.word),
    title: normalizeString(source.title, fallback.title),
    items: [
      normalizeCareItem(items[0], fallback.items[0]),
      normalizeCareItem(items[1], fallback.items[1]),
      normalizeCareItem(items[2], fallback.items[2]),
    ],
    linkLabel: normalizeString(source.linkLabel, fallback.linkLabel),
  };
}

function normalizeLocale(value: unknown, fallback: WhySectionLocale): WhySectionLocale {
  const source = asRecord(value);
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    heading: normalizeString(source.heading, fallback.heading),
    items: [
      normalizeItem(items[0], fallback.items[0]),
      normalizeItem(items[1], fallback.items[1]),
      normalizeItem(items[2], fallback.items[2]),
    ],
    care: normalizeCare(source.care, fallback.care),
  };
}

export function normalizeWhySectionContent(value: unknown): WhySectionContent {
  const source = asRecord(value);
  const images = Array.isArray(source.images) ? source.images : [];
  const backgrounds = Array.isArray(source.backgrounds) ? source.backgrounds : [];
  const productCodes = Array.isArray(source.productCodes) ? source.productCodes : [];
  return {
    images: [
      normalizeString(images[0], ""),
      normalizeString(images[1], ""),
      normalizeString(images[2], ""),
    ],
    backgrounds: [
      normalizeString(backgrounds[0], ""),
      normalizeString(backgrounds[1], ""),
      normalizeString(backgrounds[2], ""),
    ],
    productCodes: [
      normalizeString(productCodes[0], ""),
      normalizeString(productCodes[1], ""),
      normalizeString(productCodes[2], ""),
    ],
    en: normalizeLocale(source.en, DEFAULT_WHY_SECTION_CONTENT.en),
    uk: normalizeLocale(source.uk, DEFAULT_WHY_SECTION_CONTENT.uk),
  };
}

export function getDefaultWhySectionContent(): WhySectionContent {
  return normalizeWhySectionContent({});
}

/** First paint: the last server answer if this browser has one, else the defaults. */
export function getInitialWhySectionContent(): WhySectionContent {
  return normalizeWhySectionContent(peekStorefrontSetting(WHY_SECTION_KEY)?.value ?? {});
}

export async function loadWhySectionContent(): Promise<WhySectionContent> {
  try {
    const remote = await fetchStorefrontSetting<WhySectionContent>(WHY_SECTION_KEY);
    if (remote != null) return normalizeWhySectionContent(remote);
  } catch {
    // API unavailable
  }
  return getInitialWhySectionContent(); // unreachable server: keep the last answer, not the defaults
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
