import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { normalizeStoredMediaUrl } from "./storefrontMedia";

export const FEATURED_SHOWCASE_SELECTION_KEY = "yarne.featuredShowcase.v1";

export const DEFAULT_SHOWCASE_EYEBROW = "Featured Showcase";
export const DEFAULT_SHOWCASE_TITLE = "Editorial Picks";

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
  eyebrow: string;
  title: string;
  slot1: ShowcaseProductSlot;
  slot2: ShowcaseProductSlot;
  slot3: ShowcaseTextSlot;
  slot4: ShowcaseProductSlot;
};

const DEFAULT_SLOT_1: ShowcaseProductSlot = {
  imageUrl: "",
  productCode: "",
  eyebrow: "New Season",
  ctaLabel: "Discover",
};

const DEFAULT_SLOT_2: ShowcaseProductSlot = {
  imageUrl: "",
  productCode: "",
  eyebrow: "",
  ctaLabel: "",
};

const DEFAULT_SLOT_3: ShowcaseTextSlot = {
  eyebrow: "The Craft",
  heading: "Every stitch tells a story of patience and precision.",
  ctaLabel: "Read our story",
  ctaHref: "/about",
};

const DEFAULT_SLOT_4: ShowcaseProductSlot = {
  imageUrl: "",
  productCode: "",
  eyebrow: "",
  ctaLabel: "",
};

function normalizeString(value: unknown, fallback: string): string {
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
    ctaHref: normalizeString(source.ctaHref, fallback.ctaHref),
  };
}

export function normalizeFeaturedShowcaseSelection(value: unknown): FeaturedShowcaseSelection {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    eyebrow: normalizeString(source.eyebrow, DEFAULT_SHOWCASE_EYEBROW),
    title: normalizeString(source.title, DEFAULT_SHOWCASE_TITLE),
    slot1: normalizeProductSlot(source.slot1, DEFAULT_SLOT_1),
    slot2: normalizeProductSlot(source.slot2, DEFAULT_SLOT_2),
    slot3: normalizeTextSlot(source.slot3, DEFAULT_SLOT_3),
    slot4: normalizeProductSlot(source.slot4, DEFAULT_SLOT_4),
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

function hasConfiguredShowcase(selection: FeaturedShowcaseSelection): boolean {
  const productSlots = [selection.slot1, selection.slot2, selection.slot4];
  if (productSlots.some((s) => s.productCode.trim() || s.imageUrl.trim())) return true;
  if (selection.eyebrow.trim() && selection.eyebrow !== DEFAULT_SHOWCASE_EYEBROW) return true;
  if (selection.title.trim() && selection.title !== DEFAULT_SHOWCASE_TITLE) return true;
  return selection.slot3.heading.trim() !== DEFAULT_SLOT_3.heading;
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

/** Admin: load server config, or one-time migrate this browser's local config to the server. */
export async function loadFeaturedShowcaseSelectionForAdmin(): Promise<FeaturedShowcaseSelection> {
  try {
    const remote = await fetchStorefrontSetting<FeaturedShowcaseSelection>(FEATURED_SHOWCASE_SELECTION_KEY);
    if (remote != null) {
      const normalized = normalizeFeaturedShowcaseSelection(remote);
      writeLocalFeaturedShowcase(normalized);
      return normalized;
    }
  } catch {
    // continue to migration
  }

  const local = readLocalFeaturedShowcase();
  if (!hasConfiguredShowcase(local)) {
    return getDefaultFeaturedShowcaseSelection();
  }

  const normalized = normalizeFeaturedShowcaseSelection(local);
  await saveStorefrontSetting(FEATURED_SHOWCASE_SELECTION_KEY, normalized);
  writeLocalFeaturedShowcase(normalized);
  return normalized;
}

export async function persistFeaturedShowcaseSelection(
  selection: FeaturedShowcaseSelection
): Promise<FeaturedShowcaseSelection> {
  const normalized = normalizeFeaturedShowcaseSelection(selection);
  await saveStorefrontSetting(FEATURED_SHOWCASE_SELECTION_KEY, normalized);
  writeLocalFeaturedShowcase(normalized);
  return normalized;
}
