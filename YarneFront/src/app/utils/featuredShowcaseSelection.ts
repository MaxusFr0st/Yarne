import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { normalizeStoredMediaUrl } from "./storefrontMedia";

export const FEATURED_SHOWCASE_SELECTION_KEY = "yarne.featuredShowcase.v1";

export type ShowcaseProductSlot = {
  imageUrl: string;
  productCode: string;
  eyebrow: string;
  ctaLabel: string;
};

export type ShowcaseTextSlot = {
  eyebrow: string;
  heading: string;
  ctaLabel: string;
  ctaHref: string;
};

export type FeaturedShowcaseSelection = {
  slot1: ShowcaseProductSlot;
  slot2: ShowcaseProductSlot;
  slot3: ShowcaseTextSlot;
  slot4: ShowcaseProductSlot;
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

const EMPTY_SLOT_3: ShowcaseTextSlot = {
  eyebrow: "",
  heading: "",
  ctaLabel: "",
  ctaHref: "/about",
};

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

function normalizeTextSlot(value: unknown, fallback: ShowcaseTextSlot): ShowcaseTextSlot {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    eyebrow: normalizeString(source.eyebrow, fallback.eyebrow),
    heading: normalizeString(source.heading, fallback.heading),
    ctaLabel: normalizeString(source.ctaLabel, fallback.ctaLabel),
    ctaHref: normalizeString(source.ctaHref, fallback.ctaHref) || "/about",
  };
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
  return getDefaultFeaturedShowcaseSelection();
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
