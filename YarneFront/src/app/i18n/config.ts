// Single source of truth for supported locales.

export const SUPPORTED_LOCALES = ["uk", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uk";
export const FALLBACK_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "yarne.locale.v1";
/** The same choice as a cookie, so the server can send a bare yarne-acc.com/ to the right language. */
export const LOCALE_COOKIE = "yarne_locale";

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
