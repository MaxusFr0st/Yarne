import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import type { Locale } from "../i18n/config";
import en from "../i18n/locales/en";
import uk from "../i18n/locales/uk";

export const HOME_PAGE_COPY_KEY = "yarne.home.copy.v1";

export type HomePageCopyLocale = {
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    scroll: string;
  };
  bestSellers: {
    eyebrow: string;
    title: string;
  };
  featured: {
    eyebrow: string;
    viewAll: string;
    shopAllPieces: string;
  };
  editorial: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    paragraph1: string;
    paragraph2: string;
    ourStory: string;
  };
  lookbook: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    cta: string;
  };
  moreFromCollection: {
    eyebrow: string;
  };
};

export type HomePageCopy = Record<Locale, HomePageCopyLocale>;

function pickLocaleCopy(source: typeof en.home): HomePageCopyLocale {
  return {
    hero: {
      eyebrow: source.hero.eyebrow,
      titleLine1: source.hero.titleLine1,
      titleAccent: source.hero.titleAccent,
      subtitle: source.hero.subtitle,
      ctaPrimary: source.hero.ctaPrimary,
      ctaSecondary: source.hero.ctaSecondary,
      scroll: source.hero.scroll,
    },
    bestSellers: {
      eyebrow: source.bestSellers.eyebrow,
      title: source.bestSellers.title,
    },
    featured: {
      eyebrow: source.featured.eyebrow,
      viewAll: source.featured.viewAll,
      shopAllPieces: "Shop All {{count}} Pieces",
    },
    editorial: {
      eyebrow: source.editorial.eyebrow,
      titleLine1: source.editorial.titleLine1,
      titleLine2: source.editorial.titleLine2,
      paragraph1: source.editorial.paragraph1,
      paragraph2: source.editorial.paragraph2,
      ourStory: source.editorial.ourStory,
    },
    lookbook: {
      eyebrow: source.lookbook.eyebrow,
      titleLine1: source.lookbook.titleLine1,
      titleLine2: source.lookbook.titleLine2,
      cta: source.lookbook.cta,
    },
    moreFromCollection: {
      eyebrow: source.moreFromCollection.eyebrow,
    },
  };
}

export const DEFAULT_HOME_PAGE_COPY: HomePageCopy = {
  en: pickLocaleCopy(en.home),
  uk: pickLocaleCopy(uk.home),
};

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeLocaleCopy(value: unknown, fallback: HomePageCopyLocale): HomePageCopyLocale {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const hero = typeof source.hero === "object" && source.hero !== null ? (source.hero as Record<string, unknown>) : {};
  const bestSellers =
    typeof source.bestSellers === "object" && source.bestSellers !== null
      ? (source.bestSellers as Record<string, unknown>)
      : {};
  const featured =
    typeof source.featured === "object" && source.featured !== null
      ? (source.featured as Record<string, unknown>)
      : {};
  const editorial =
    typeof source.editorial === "object" && source.editorial !== null
      ? (source.editorial as Record<string, unknown>)
      : {};
  const lookbook =
    typeof source.lookbook === "object" && source.lookbook !== null
      ? (source.lookbook as Record<string, unknown>)
      : {};
  const moreFromCollection =
    typeof source.moreFromCollection === "object" && source.moreFromCollection !== null
      ? (source.moreFromCollection as Record<string, unknown>)
      : {};

  return {
    hero: {
      eyebrow: normalizeString(hero.eyebrow, fallback.hero.eyebrow),
      titleLine1: normalizeString(hero.titleLine1, fallback.hero.titleLine1),
      titleAccent: normalizeString(hero.titleAccent, fallback.hero.titleAccent),
      subtitle: normalizeString(hero.subtitle, fallback.hero.subtitle),
      ctaPrimary: normalizeString(hero.ctaPrimary, fallback.hero.ctaPrimary),
      ctaSecondary: normalizeString(hero.ctaSecondary, fallback.hero.ctaSecondary),
      scroll: normalizeString(hero.scroll, fallback.hero.scroll),
    },
    bestSellers: {
      eyebrow: normalizeString(bestSellers.eyebrow, fallback.bestSellers.eyebrow),
      title: normalizeString(bestSellers.title, fallback.bestSellers.title),
    },
    featured: {
      eyebrow: normalizeString(featured.eyebrow, fallback.featured.eyebrow),
      viewAll: normalizeString(featured.viewAll, fallback.featured.viewAll),
      shopAllPieces: normalizeString(featured.shopAllPieces, fallback.featured.shopAllPieces),
    },
    editorial: {
      eyebrow: normalizeString(editorial.eyebrow, fallback.editorial.eyebrow),
      titleLine1: normalizeString(editorial.titleLine1, fallback.editorial.titleLine1),
      titleLine2: normalizeString(editorial.titleLine2, fallback.editorial.titleLine2),
      paragraph1: normalizeString(editorial.paragraph1, fallback.editorial.paragraph1),
      paragraph2: normalizeString(editorial.paragraph2, fallback.editorial.paragraph2),
      ourStory: normalizeString(editorial.ourStory, fallback.editorial.ourStory),
    },
    lookbook: {
      eyebrow: normalizeString(lookbook.eyebrow, fallback.lookbook.eyebrow),
      titleLine1: normalizeString(lookbook.titleLine1, fallback.lookbook.titleLine1),
      titleLine2: normalizeString(lookbook.titleLine2, fallback.lookbook.titleLine2),
      cta: normalizeString(lookbook.cta, fallback.lookbook.cta),
    },
    moreFromCollection: {
      eyebrow: normalizeString(moreFromCollection.eyebrow, fallback.moreFromCollection.eyebrow),
    },
  };
}

export function normalizeHomePageCopy(value: unknown): HomePageCopy {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    en: normalizeLocaleCopy(source.en, DEFAULT_HOME_PAGE_COPY.en),
    uk: normalizeLocaleCopy(source.uk, DEFAULT_HOME_PAGE_COPY.uk),
  };
}

export function getDefaultHomePageCopy(): HomePageCopy {
  return normalizeHomePageCopy({});
}

function readLocalHomePageCopy(): HomePageCopy {
  if (typeof window === "undefined") return getDefaultHomePageCopy();
  const raw = window.localStorage.getItem(HOME_PAGE_COPY_KEY);
  if (raw == null) return getDefaultHomePageCopy();
  try {
    return normalizeHomePageCopy(JSON.parse(raw));
  } catch {
    return getDefaultHomePageCopy();
  }
}

function writeLocalHomePageCopy(copy: HomePageCopy) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HOME_PAGE_COPY_KEY, JSON.stringify(copy));
}

export async function loadHomePageCopy(): Promise<HomePageCopy> {
  try {
    const remote = await fetchStorefrontSetting<HomePageCopy>(HOME_PAGE_COPY_KEY);
    if (remote != null) {
      const normalized = normalizeHomePageCopy(remote);
      writeLocalHomePageCopy(normalized);
      return normalized;
    }
  } catch {
    // API unavailable
  }
  return getDefaultHomePageCopy();
}

export async function loadHomePageCopyForAdmin(): Promise<HomePageCopy> {
  try {
    const remote = await fetchStorefrontSetting<HomePageCopy>(HOME_PAGE_COPY_KEY);
    if (remote != null) {
      const normalized = normalizeHomePageCopy(remote);
      writeLocalHomePageCopy(normalized);
      return normalized;
    }
  } catch {
    // continue
  }
  return getDefaultHomePageCopy();
}

export async function persistHomePageCopy(copy: HomePageCopy): Promise<HomePageCopy> {
  const normalized = normalizeHomePageCopy(copy);
  await saveStorefrontSetting(HOME_PAGE_COPY_KEY, normalized);
  writeLocalHomePageCopy(normalized);
  return normalized;
}

export function getHomePageCopyForLocale(copy: HomePageCopy, locale: Locale): HomePageCopyLocale {
  return copy[locale] ?? copy.en;
}
