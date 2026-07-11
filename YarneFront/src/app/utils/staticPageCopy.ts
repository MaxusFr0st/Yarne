import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import type { Locale } from "../i18n/config";
import en from "../i18n/locales/en";
import uk from "../i18n/locales/uk";

export const STATIC_PAGE_COPY_KEY = "yarne.staticPages.v1";

export type StaticPageLocaleContent = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
};

export type StaticPagesCopy = {
  ourHistory: Record<Locale, StaticPageLocaleContent>;
};

const UK_OUR_HISTORY_PARAGRAPHS = [
  "YARNE був заснований у 2025 році в невеликій в'язальній майстерні з однією простою ідеєю — створити в'язану сумку, яка не виглядатиме звично.",
  "Ми не прагнули слідувати трендам. Ми хотіли переосмислити саму категорію, поєднавши сучасний дизайн, ручну майстерність і матеріали, здатні зберігати свою красу протягом багатьох сезонів.",
  "Кожна сумка YARNÉ починається з уважного відбору пряжі та завершується виробом, у якому кожна деталь має своє значення. Ми свідомо обираємо якість замість компромісів, адже переконані, що справжня цінність аксесуара визначається не лише його зовнішнім виглядом, а й тим, як він служить з часом.",
  "Для нас сумка — це більше, ніж функціональна річ. Це завершальний акцент образу. Та сама деталь, яка привертає увагу без зайвих слів і залишається актуальною незалежно від сезону.",
  "Ми створюємо речі не на один сезон. Ми створюємо аксесуари, до яких хочеться повертатися знову і знову.",
];

const EN_OUR_HISTORY_PARAGRAPHS = [
  "YARNÉ was founded in 2025 in a small knitting atelier with one simple idea — to create a knitted bag that would not look ordinary.",
  "We did not set out to follow trends. We wanted to rethink the category itself, combining contemporary design, hand craftsmanship, and materials that retain their beauty across many seasons.",
  "Every YARNÉ bag begins with a careful selection of yarn and ends with a piece in which every detail matters. We consciously choose quality over compromise, believing that the true value of an accessory is defined not only by how it looks, but by how it serves you over time.",
  "For us, a bag is more than a functional object. It is the finishing accent of a look — the detail that draws attention without excess words and remains relevant regardless of season.",
  "We do not create pieces for a single season. We create accessories you will want to return to again and again.",
];

function pickOurHistoryContent(locale: Locale): StaticPageLocaleContent {
  if (locale === "uk") {
    return {
      eyebrow: uk.pages.ourHistory.eyebrow,
      title: uk.pages.ourHistory.title,
      paragraphs: UK_OUR_HISTORY_PARAGRAPHS,
    };
  }
  return {
    eyebrow: en.pages.ourHistory.eyebrow,
    title: en.pages.ourHistory.title,
    paragraphs: EN_OUR_HISTORY_PARAGRAPHS,
  };
}

export const DEFAULT_STATIC_PAGES_COPY: StaticPagesCopy = {
  ourHistory: {
    en: pickOurHistoryContent("en"),
    uk: pickOurHistoryContent("uk"),
  },
};

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeParagraphs(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const paragraphs = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return paragraphs.length > 0 ? paragraphs : fallback;
}

function normalizeLocaleContent(value: unknown, fallback: StaticPageLocaleContent): StaticPageLocaleContent {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    eyebrow: normalizeString(source.eyebrow, fallback.eyebrow),
    title: normalizeString(source.title, fallback.title),
    paragraphs: normalizeParagraphs(source.paragraphs, fallback.paragraphs),
  };
}

export function normalizeStaticPagesCopy(value: unknown): StaticPagesCopy {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const ourHistory =
    typeof source.ourHistory === "object" && source.ourHistory !== null
      ? (source.ourHistory as Record<string, unknown>)
      : {};

  return {
    ourHistory: {
      en: normalizeLocaleContent(ourHistory.en, DEFAULT_STATIC_PAGES_COPY.ourHistory.en),
      uk: normalizeLocaleContent(ourHistory.uk, DEFAULT_STATIC_PAGES_COPY.ourHistory.uk),
    },
  };
}

export function getDefaultStaticPagesCopy(): StaticPagesCopy {
  return normalizeStaticPagesCopy({});
}

function readLocalStaticPagesCopy(): StaticPagesCopy {
  if (typeof window === "undefined") return getDefaultStaticPagesCopy();
  const raw = window.localStorage.getItem(STATIC_PAGE_COPY_KEY);
  if (raw == null) return getDefaultStaticPagesCopy();
  try {
    return normalizeStaticPagesCopy(JSON.parse(raw));
  } catch {
    return getDefaultStaticPagesCopy();
  }
}

function writeLocalStaticPagesCopy(copy: StaticPagesCopy) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATIC_PAGE_COPY_KEY, JSON.stringify(copy));
}

export async function loadStaticPagesCopy(): Promise<StaticPagesCopy> {
  try {
    const remote = await fetchStorefrontSetting<StaticPagesCopy>(STATIC_PAGE_COPY_KEY);
    if (remote != null) {
      const normalized = normalizeStaticPagesCopy(remote);
      writeLocalStaticPagesCopy(normalized);
      return normalized;
    }
  } catch {
    // API unavailable
  }
  return getDefaultStaticPagesCopy();
}

export async function loadStaticPagesCopyForAdmin(): Promise<StaticPagesCopy> {
  try {
    const remote = await fetchStorefrontSetting<StaticPagesCopy>(STATIC_PAGE_COPY_KEY);
    if (remote != null) {
      const normalized = normalizeStaticPagesCopy(remote);
      writeLocalStaticPagesCopy(normalized);
      return normalized;
    }
  } catch {
    // continue
  }
  return getDefaultStaticPagesCopy();
}

export async function persistStaticPagesCopy(copy: StaticPagesCopy): Promise<StaticPagesCopy> {
  const normalized = normalizeStaticPagesCopy(copy);
  await saveStorefrontSetting(STATIC_PAGE_COPY_KEY, normalized);
  writeLocalStaticPagesCopy(normalized);
  return normalized;
}

export function getStaticPageContentForLocale(
  copy: StaticPagesCopy,
  pageKey: keyof StaticPagesCopy,
  locale: Locale,
): StaticPageLocaleContent {
  return copy[pageKey][locale] ?? copy[pageKey].en;
}

export function paragraphsToText(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}
