// Single source of truth for supported locales.

export const SUPPORTED_LOCALES = ["en", "uk"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const FALLBACK_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "yarne.locale.v1";
// Cached geo-IP country result, so we don't probe on every page load.
export const GEO_COUNTRY_STORAGE_KEY = "yarne.geo.country.v1";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

// Pretty labels for UI surfaces (switcher, sr-only, etc.).
export const LOCALE_DISPLAY: Record<Locale, { native: string; short: string }> =
  {
    en: { native: "English", short: "EN" },
    uk: { native: "Українська", short: "UA" },
  };
