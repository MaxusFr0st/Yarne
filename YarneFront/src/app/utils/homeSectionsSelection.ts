const HOME_SECTIONS_SELECTION_KEY = "yarne.home.sections.v1";

export const DEFAULT_FEATURED_TITLE = "Featured this season";
export const DEFAULT_MORE_FROM_COLLECTION_TITLE = "More from the collection";

export type HomeSectionsSelection = {
  featuredTitle: string;
  featuredProductCodes: string[];
  moreFromCollectionTitle: string;
  moreFromCollectionProductCodes: string[];
};

function normalizeCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  const onlyStrings = codes.filter((code): code is string => typeof code === "string");
  return Array.from(new Set(onlyStrings));
}

function normalizeTitle(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeSelection(value: unknown): HomeSectionsSelection {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    featuredTitle: normalizeTitle(source.featuredTitle, DEFAULT_FEATURED_TITLE),
    featuredProductCodes: normalizeCodes(source.featuredProductCodes),
    moreFromCollectionTitle: normalizeTitle(source.moreFromCollectionTitle, DEFAULT_MORE_FROM_COLLECTION_TITLE),
    moreFromCollectionProductCodes: normalizeCodes(source.moreFromCollectionProductCodes),
  };
}

export function getHomeSectionsSelection(): HomeSectionsSelection {
  if (typeof window === "undefined") {
    return normalizeSelection({});
  }

  const raw = window.localStorage.getItem(HOME_SECTIONS_SELECTION_KEY);
  if (raw == null) {
    return normalizeSelection({});
  }

  try {
    return normalizeSelection(JSON.parse(raw));
  } catch {
    return normalizeSelection({});
  }
}

export function saveHomeSectionsSelection(selection: HomeSectionsSelection): HomeSectionsSelection {
  const normalized = normalizeSelection(selection);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(HOME_SECTIONS_SELECTION_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
