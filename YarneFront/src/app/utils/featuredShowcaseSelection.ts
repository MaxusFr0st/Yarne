import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { normalizeStoredMediaUrl } from "./storefrontMedia";

export const FEATURED_SHOWCASE_SELECTION_KEY = "yarne.featuredShowcase.v1";

export type ShowcaseProductSlot = {
  imageUrl: string;
  productCode: string;
  eyebrow: string;
  ctaLabel: string;
};

export type ShowcaseTextLocaleCopy = { eyebrow: string; heading: string; ctaLabel: string };

export type ShowcaseTextSlot = {
  ctaHref: string;
  en: ShowcaseTextLocaleCopy;
  uk: ShowcaseTextLocaleCopy;
};

export type FeaturedShowcaseSelection = {
  slot1: ShowcaseProductSlot;
  slot2: ShowcaseProductSlot;
  slot3: ShowcaseTextSlot;
  slot4: ShowcaseProductSlot;
};

const EMPTY_LOCALE_COPY: ShowcaseTextLocaleCopy = {
  eyebrow: "",
  heading: "",
  ctaLabel: "",
};

const EMPTY_SLOT_1: ShowcaseProductSlot = {
  imageUrl: "",
  productCode: "",
  eyebrow: "",
  ctaLabel: "",
};

const EMPTY_SLOT_2: ShowcaseProductSlot = {
  imageUrl: "",
  productCode: "",
  eyebrow: "",
  ctaLabel: "",
};

const OUR_HISTORY_PATH = "/pages/our-history";

const EMPTY_SLOT_3: ShowcaseTextSlot = {
  ctaHref: OUR_HISTORY_PATH,
  en: { ...EMPTY_LOCALE_COPY },
  uk: { ...EMPTY_LOCALE_COPY },
};

/** Keep story-card CTAs on the in-app history route (not external yarne-acc URLs). */
export function normalizeShowcaseCtaHref(value: unknown, fallback = OUR_HISTORY_PATH): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;

  const lower = raw.toLowerCase();
  if (
    lower.includes("our-history") ||
    lower === "/about" ||
    lower === "about" ||
    lower.endsWith("/about") ||
    lower.includes("/pages/about")
  ) {
    return OUR_HISTORY_PATH;
  }

  if (/^[a-z][a-z0-9+\-.]*:/i.test(raw) || raw.startsWith("//")) {
    try {
      const url = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
      const path = url.pathname.toLowerCase();
      if (path.includes("our-history") || path.endsWith("/about") || path.includes("/pages/about")) {
        return OUR_HISTORY_PATH;
      }
    } catch {
      return fallback;
    }
    // Unrelated absolute URL — leave as entered (TextTile will open via <a>).
    return raw;
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
}

const EMPTY_SLOT_4: ShowcaseProductSlot = {
  imageUrl: "",
  productCode: "",
  eyebrow: "",
  ctaLabel: "",
};

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeProductSlot(value: unknown, fallback: ShowcaseProductSlot): ShowcaseProductSlot {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    imageUrl: normalizeStoredMediaUrl(normalizeString(source.imageUrl, fallback.imageUrl)),
    productCode: normalizeString(source.productCode, fallback.productCode),
    eyebrow: normalizeString(source.eyebrow, fallback.eyebrow),
    ctaLabel: normalizeString(source.ctaLabel, fallback.ctaLabel),
  };
}

function normalizeLocaleCopy(value: unknown, fallback: ShowcaseTextLocaleCopy): ShowcaseTextLocaleCopy {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    eyebrow: normalizeString(source.eyebrow, fallback.eyebrow),
    heading: normalizeString(source.heading, fallback.heading),
    ctaLabel: normalizeString(source.ctaLabel, fallback.ctaLabel),
  };
}

function localeCopyHasContent(copy: ShowcaseTextLocaleCopy): boolean {
  return Boolean(copy.eyebrow.trim() || copy.heading.trim() || copy.ctaLabel.trim());
}

function normalizeTextSlot(value: unknown, fallback: ShowcaseTextSlot): ShowcaseTextSlot {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const ctaHref = normalizeShowcaseCtaHref(source.ctaHref, fallback.ctaHref || OUR_HISTORY_PATH);

  const hasNested =
    (typeof source.en === "object" && source.en !== null) ||
    (typeof source.uk === "object" && source.uk !== null);

  if (hasNested) {
    return {
      ctaHref,
      en: normalizeLocaleCopy(source.en, fallback.en),
      uk: normalizeLocaleCopy(source.uk, fallback.uk),
    };
  }

  // Legacy flat `{ eyebrow, heading, ctaLabel, ctaHref }` → migrate into uk; leave en empty.
  return {
    ctaHref,
    en: { ...EMPTY_LOCALE_COPY },
    uk: {
      eyebrow: normalizeString(source.eyebrow, fallback.uk.eyebrow),
      heading: normalizeString(source.heading, fallback.uk.heading),
      ctaLabel: normalizeString(source.ctaLabel, fallback.uk.ctaLabel),
    },
  };
}

/** Locale copy with fallback: requested → uk → en. */
export function getShowcaseTextForLocale(
  slot: ShowcaseTextSlot,
  locale: string
): ShowcaseTextLocaleCopy {
  const requested = locale === "en" ? slot.en : slot.uk;
  if (localeCopyHasContent(requested)) return requested;
  if (localeCopyHasContent(slot.uk)) return slot.uk;
  if (localeCopyHasContent(slot.en)) return slot.en;
  return requested;
}

export function normalizeFeaturedShowcaseSelection(value: unknown): FeaturedShowcaseSelection {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    slot1: normalizeProductSlot(source.slot1, EMPTY_SLOT_1),
    slot2: normalizeProductSlot(source.slot2, EMPTY_SLOT_2),
    slot3: normalizeTextSlot(source.slot3, EMPTY_SLOT_3),
    slot4: normalizeProductSlot(source.slot4, EMPTY_SLOT_4),
  };
}

export function getDefaultFeaturedShowcaseSelection(): FeaturedShowcaseSelection {
  return normalizeFeaturedShowcaseSelection({});
}

function readLocalFeaturedShowcase(): FeaturedShowcaseSelection {
  if (typeof window === "undefined") return getDefaultFeaturedShowcaseSelection();
  const raw = window.localStorage.getItem(FEATURED_SHOWCASE_SELECTION_KEY);
  if (raw == null) return getDefaultFeaturedShowcaseSelection();
  try {
    return normalizeFeaturedShowcaseSelection(JSON.parse(raw));
  } catch {
    return getDefaultFeaturedShowcaseSelection();
  }
}

function writeLocalFeaturedShowcase(selection: FeaturedShowcaseSelection) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FEATURED_SHOWCASE_SELECTION_KEY, JSON.stringify(selection));
}

/** @deprecated Use loadFeaturedShowcaseSelection; kept for same-tab storage events. */
export function getFeaturedShowcaseSelection(): FeaturedShowcaseSelection {
  return readLocalFeaturedShowcase();
}

/** Public storefront: server only — never show another device's localStorage. */
export async function loadFeaturedShowcaseSelection(): Promise<FeaturedShowcaseSelection> {
  try {
    const remote = await fetchStorefrontSetting<FeaturedShowcaseSelection>(FEATURED_SHOWCASE_SELECTION_KEY);
    if (remote != null) {
      const normalized = normalizeFeaturedShowcaseSelection(remote);
      writeLocalFeaturedShowcase(normalized);
      return normalized;
    }
  } catch {
    // API unavailable
  }
  return readLocalFeaturedShowcase();
}

/** Admin: load server config; empty defaults when nothing is saved yet. */
export async function loadFeaturedShowcaseSelectionForAdmin(): Promise<FeaturedShowcaseSelection> {
  try {
    const remote = await fetchStorefrontSetting<FeaturedShowcaseSelection>(FEATURED_SHOWCASE_SELECTION_KEY);
    if (remote != null) {
      const normalized = normalizeFeaturedShowcaseSelection(remote);
      writeLocalFeaturedShowcase(normalized);
      return normalized;
    }
  } catch {
    // fall through to empty default
  }

  return getDefaultFeaturedShowcaseSelection();
}

export async function persistFeaturedShowcaseSelection(
  selection: FeaturedShowcaseSelection
): Promise<FeaturedShowcaseSelection> {
  const normalized = normalizeFeaturedShowcaseSelection(selection);
  await saveStorefrontSetting(FEATURED_SHOWCASE_SELECTION_KEY, normalized);
  writeLocalFeaturedShowcase(normalized);
  return normalized;
}
