import type { Locale } from "./config";

const LOCALE_BCP47: Record<Locale, string> = {
  en: "en-IE",
  uk: "uk-UA",
};

/** Official Ukrainian hryvnia sign (Unicode U+20B4), adopted by NBU in 2004. */
export const HRYVNIA_SIGN = "\u20B4";

function getHryvniaUnit(amount: number): string {
  const wholeUnits = Math.floor(Math.abs(amount));
  const mod100 = wholeUnits % 100;
  const mod10 = wholeUnits % 10;

  if (mod100 >= 11 && mod100 <= 14) return "гривень";
  if (mod10 === 1) return "гривня";
  if (mod10 >= 2 && mod10 <= 4) return "гривні";
  return "гривень";
}

function formatAmountNumber(amount: number, locale: Locale): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(LOCALE_BCP47[locale], {
    minimumFractionDigits: Number.isInteger(safe) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(safe) ? 0 : 2,
  }).format(safe);
}

export function formatPriceCompact(amount: number, locale: Locale): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${HRYVNIA_SIGN} ${formatAmountNumber(safe, locale)}`;
}

export function splitPriceCompact(amount: number, locale: Locale): { symbol: string; value: string } {
  const safe = Number.isFinite(amount) ? amount : 0;
  return {
    symbol: HRYVNIA_SIGN,
    value: formatAmountNumber(safe, locale),
  };
}

export function formatPrice(amount: number, locale: Locale): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const amountStr = formatAmountNumber(safe, locale);

  if (locale === "uk") {
    return `${HRYVNIA_SIGN}\u00a0${amountStr} ${getHryvniaUnit(safe)}`;
  }

  return formatPriceCompact(safe, locale);
}

export function formatPriceFromPrefix(
  amount: number,
  locale: Locale,
  prefix: string
): string {
  return `${prefix} ${formatPrice(amount, locale)}`.trim();
}
