import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";

export const HOME_SECTIONS_SELECTION_KEY = "yarne.home.sections.v1";

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

export function normalizeHomeSectionsSelection(value: unknown): HomeSectionsSelection {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    featuredTitle: normalizeTitle(source.featuredTitle, DEFAULT_FEATURED_TITLE),
    featuredProductCodes: normalizeCodes(source.featuredProductCodes),
    moreFromCollectionTitle: normalizeTitle(source.moreFromCollectionTitle, DEFAULT_MORE_FROM_COLLECTION_TITLE),
    moreFromCollectionProductCodes: normalizeCodes(source.moreFromCollectionProductCodes),
  };
}

export function getDefaultHomeSectionsSelection(): HomeSectionsSelection {
  return normalizeHomeSectionsSelection({});
}

function readLocalHomeSections(): HomeSectionsSelection {
  if (typeof window === "undefined") return getDefaultHomeSectionsSelection();
  const raw = window.localStorage.getItem(HOME_SECTIONS_SELECTION_KEY);
  if (raw == null) return getDefaultHomeSectionsSelection();
  try {
    return normalizeHomeSectionsSelection(JSON.parse(raw));
  } catch {
    return getDefaultHomeSectionsSelection();
  }
}

function writeLocalHomeSections(selection: HomeSectionsSelection) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HOME_SECTIONS_SELECTION_KEY, JSON.stringify(selection));
}

function hasConfiguredHomeSections(selection: HomeSectionsSelection): boolean {
  return (
    selection.featuredProductCodes.length > 0
    || selection.moreFromCollectionProductCodes.length > 0
    || selection.featuredTitle !== DEFAULT_FEATURED_TITLE
    || selection.moreFromCollectionTitle !== DEFAULT_MORE_FROM_COLLECTION_TITLE
  );
}

export function getHomeSectionsSelection(): HomeSectionsSelection {
  return readLocalHomeSections();
}

export async function loadHomeSectionsSelection(): Promise<HomeSectionsSelection> {
  try {
    const remote = await fetchStorefrontSetting<HomeSectionsSelection>(HOME_SECTIONS_SELECTION_KEY);
    if (remote != null) {
      const normalized = normalizeHomeSectionsSelection(remote);
      writeLocalHomeSections(normalized);
      return normalized;
    }
  } catch {
    // API unavailable
  }
  return getDefaultHomeSectionsSelection();
}

export async function loadHomeSectionsSelectionForAdmin(): Promise<HomeSectionsSelection> {
  try {
    const remote = await fetchStorefrontSetting<HomeSectionsSelection>(HOME_SECTIONS_SELECTION_KEY);
    if (remote != null) {
      const normalized = normalizeHomeSectionsSelection(remote);
      writeLocalHomeSections(normalized);
      return normalized;
    }
  } catch {
    // continue
  }

  const local = readLocalHomeSections();
  if (!hasConfiguredHomeSections(local)) {
    return getDefaultHomeSectionsSelection();
  }

  const normalized = normalizeHomeSectionsSelection(local);
  await saveStorefrontSetting(HOME_SECTIONS_SELECTION_KEY, normalized);
  writeLocalHomeSections(normalized);
  return normalized;
}

export async function persistHomeSectionsSelection(
  selection: HomeSectionsSelection
): Promise<HomeSectionsSelection> {
  const normalized = normalizeHomeSectionsSelection(selection);
  await saveStorefrontSetting(HOME_SECTIONS_SELECTION_KEY, normalized);
  writeLocalHomeSections(normalized);
  return normalized;
}
