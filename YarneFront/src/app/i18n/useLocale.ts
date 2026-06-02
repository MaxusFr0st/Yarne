// Resolves the active locale from the current URL (e.g. /uk/collection → 'uk').
// Falls back to i18next's current language, then DEFAULT_LOCALE.

import { useMemo } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_LOCALE,
  isLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from "./config";

export function getLocaleFromPath(pathname: string): Locale | null {
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : null;
}

/** Strip the leading /:lang segment (if present) from a pathname. */
export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/");
  // pathname like '/en/foo' → ['', 'en', 'foo']
  if (segments.length > 1 && isLocale(segments[1])) {
    segments.splice(1, 1);
  }
  const rest = segments.join("/");
  return rest.length > 0 ? rest : "/";
}

/** Prefix a target path with the given locale, preserving query/hash. */
export function withLocale(to: string, locale: Locale): string {
  if (typeof to !== "string" || to.length === 0) return `/${locale}/`;
  // Absolute URLs and protocol-relative URLs are returned unchanged.
  if (/^[a-z][a-z0-9+\-.]*:/i.test(to) || to.startsWith("//")) return to;
  // Hash-only or query-only links have no path to prefix.
  if (to.startsWith("#") || to.startsWith("?")) return to;
  // Already prefixed.
  if (
    SUPPORTED_LOCALES.some(
      (l) => to === `/${l}` || to.startsWith(`/${l}/`)
    )
  ) {
    return to;
  }
  // Reserved top-level paths that opt out of locale prefixing.
  if (to === "/admin" || to.startsWith("/admin/")) return to;

  const normalized = to.startsWith("/") ? to : `/${to}`;
  return `/${locale}${normalized === "/" ? "" : normalized}` || `/${locale}/`;
}

export function useLocale(): Locale {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  return useMemo(() => {
    const fromPath = getLocaleFromPath(pathname);
    if (fromPath) return fromPath;
    if (isLocale(i18n.language)) return i18n.language;
    return DEFAULT_LOCALE;
  }, [pathname, i18n.language]);
}
