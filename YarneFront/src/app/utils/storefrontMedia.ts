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

/**
 * Always load /uploads/... from the API host (VITE_API_URL), never from the frontend origin
 * or a stale localhost URL saved in the database.
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:")) return trimmed;

  let uploadPath: string | null = null;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        uploadPath = parsed.pathname;
      }
    } else if (trimmed.startsWith("/uploads/")) {
      uploadPath = trimmed;
    }
  } catch {
    uploadPath = null;
  }

  if (uploadPath) {
    return buildApiUrl(resolveApiBase(), uploadPath);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return buildApiUrl(resolveApiBase(), path);
}
