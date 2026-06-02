const FEATURED_SHOWCASE_SELECTION_KEY = "yarne.featuredShowcase.v1";

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
    imageUrl: normalizeString(source.imageUrl, fallback.imageUrl),
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

function normalizeSelection(value: unknown): FeaturedShowcaseSelection {
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

export function getFeaturedShowcaseSelection(): FeaturedShowcaseSelection {
  if (typeof window === "undefined") {
    return normalizeSelection({});
  }

  const raw = window.localStorage.getItem(FEATURED_SHOWCASE_SELECTION_KEY);
  if (raw == null) {
    return normalizeSelection({});
  }

  try {
    return normalizeSelection(JSON.parse(raw));
  } catch {
    return normalizeSelection({});
  }
}

export function saveFeaturedShowcaseSelection(
  selection: FeaturedShowcaseSelection
): FeaturedShowcaseSelection {
  const normalized = normalizeSelection(selection);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      FEATURED_SHOWCASE_SELECTION_KEY,
      JSON.stringify(normalized)
    );
  }
  return normalized;
}
