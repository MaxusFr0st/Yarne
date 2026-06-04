import { buildApiUrl, resolveApiBase } from "../api/base";

/** Store upload paths in DB/settings so all clients use the current API host. */
export function normalizeStoredMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:")) return trimmed;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        return parsed.pathname;
      }
      return trimmed;
    }
  } catch {
    return trimmed;
  }

  return trimmed.startsWith("/") ? trimmed : trimmed;
}

function isBundledOrExternalAsset(url: string): boolean {
  if (url.startsWith("data:")) return true;
  if (url.startsWith("/assets/")) return true;
  if (/^https?:\/\//i.test(url)) {
    try {
      const path = new URL(url).pathname;
      return !path.startsWith("/uploads/");
    } catch {
      return true;
    }
  }
  return !url.startsWith("/uploads/");
}

/**
 * Resolve /uploads/... against VITE_API_URL. Leave bundled /assets/ and external URLs unchanged.
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return "";

  if (isBundledOrExternalAsset(trimmed)) {
    return trimmed;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return buildApiUrl(resolveApiBase(), path);
}

/** Prefer uploaded hero; otherwise bundled default (must not be sent through API base URL). */
export function resolveHeroImageSrc(customUrl: string, bundledDefault: string): string {
  const trimmed = customUrl.trim();
  if (!trimmed) return bundledDefault;
  return resolveMediaUrl(trimmed) || bundledDefault;
}
