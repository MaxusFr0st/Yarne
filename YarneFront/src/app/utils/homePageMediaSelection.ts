import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { normalizeStoredMediaUrl } from "./storefrontMedia";

export const HOME_PAGE_MEDIA_KEY = "yarne.home.media.v1";

export type HomePageMediaSelection = {
  heroImageUrl: string;
  editorialImageUrl: string;
  lookbookImageUrl: string;
};

export function normalizeHomePageMediaSelection(value: unknown): HomePageMediaSelection {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const str = (key: string) =>
    typeof source[key] === "string" ? normalizeStoredMediaUrl(source[key] as string) : "";
  return {
    heroImageUrl: str("heroImageUrl"),
    editorialImageUrl: str("editorialImageUrl"),
    lookbookImageUrl: str("lookbookImageUrl"),
  };
}

export function getDefaultHomePageMediaSelection(): HomePageMediaSelection {
  return normalizeHomePageMediaSelection({});
}

function readLocalHomePageMedia(): HomePageMediaSelection {
  if (typeof window === "undefined") return getDefaultHomePageMediaSelection();
  const raw = window.localStorage.getItem(HOME_PAGE_MEDIA_KEY);
  if (raw == null) return getDefaultHomePageMediaSelection();
  try {
    return normalizeHomePageMediaSelection(JSON.parse(raw));
  } catch {
    return getDefaultHomePageMediaSelection();
  }
}

function writeLocalHomePageMedia(selection: HomePageMediaSelection) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HOME_PAGE_MEDIA_KEY, JSON.stringify(selection));
}

function hasConfiguredMedia(selection: HomePageMediaSelection): boolean {
  return Boolean(
    selection.heroImageUrl.trim()
    || selection.editorialImageUrl.trim()
    || selection.lookbookImageUrl.trim()
  );
}

export async function loadHomePageMediaSelection(): Promise<HomePageMediaSelection> {
  try {
    const remote = await fetchStorefrontSetting<HomePageMediaSelection>(HOME_PAGE_MEDIA_KEY);
    if (remote != null) {
      const normalized = normalizeHomePageMediaSelection(remote);
      writeLocalHomePageMedia(normalized);
      return normalized;
    }
  } catch {
    // API unavailable
  }
  return getDefaultHomePageMediaSelection();
}

export async function loadHomePageMediaSelectionForAdmin(): Promise<HomePageMediaSelection> {
  try {
    const remote = await fetchStorefrontSetting<HomePageMediaSelection>(HOME_PAGE_MEDIA_KEY);
    if (remote != null) {
      const normalized = normalizeHomePageMediaSelection(remote);
      writeLocalHomePageMedia(normalized);
      return normalized;
    }
  } catch {
    // continue
  }

  const local = readLocalHomePageMedia();
  if (!hasConfiguredMedia(local)) {
    return getDefaultHomePageMediaSelection();
  }

  const normalized = normalizeHomePageMediaSelection(local);
  await saveStorefrontSetting(HOME_PAGE_MEDIA_KEY, normalized);
  writeLocalHomePageMedia(normalized);
  return normalized;
}

export async function persistHomePageMediaSelection(
  selection: HomePageMediaSelection
): Promise<HomePageMediaSelection> {
  const normalized = normalizeHomePageMediaSelection(selection);
  await saveStorefrontSetting(HOME_PAGE_MEDIA_KEY, normalized);
  writeLocalHomePageMedia(normalized);
  return normalized;
}
