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

/** Only rewrite /uploads/... paths to the API base. Other URLs are left unchanged. */
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
      } else {
        return trimmed;
      }
    } else if (trimmed.startsWith("/uploads/")) {
      uploadPath = trimmed;
    }
  } catch {
    return trimmed;
  }

  if (uploadPath) {
    return buildApiUrl(resolveApiBase(), uploadPath);
  }

  return trimmed;
}
