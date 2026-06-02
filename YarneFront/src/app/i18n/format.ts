import type { Locale } from "./config";

const LOCALE_BCP47: Record<Locale, string> = {
  en: "en-IE",
  uk: "uk-UA",
};

export function formatPrice(amount: number, locale: Locale): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    const formatted = new Intl.NumberFormat(LOCALE_BCP47[locale], {
      style: "currency",
      currency: "EUR",
      // Pin the visible glyph: some browser/ICU combinations default to the
      // ISO code ("285 EUR") for non-native currencies on Slavic locales,
      // which looks like a bug. `narrowSymbol` forces "€" everywhere.
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: Number.isInteger(safe) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(safe) ? 0 : 2,
    }).format(safe);
    // Some Intl outputs use NBSP (U+00A0) or NNBSP (U+202F) between the
    // amount and the symbol — replace with a regular space for consistency
    // with the rest of the typography.
    return formatted.replace(/[\u00A0\u202F]/g, " ");
  } catch {
    return locale === "uk" ? `${safe} €` : `€${safe}`;
  }
}

export function formatPriceFromPrefix(
  amount: number,
  locale: Locale,
  prefix: string
): string {
  return `${prefix} ${formatPrice(amount, locale)}`.trim();
}
