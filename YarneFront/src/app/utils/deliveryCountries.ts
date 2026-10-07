import type { Locale } from "../i18n/config";

/** A country Nova Post delivers to that the shop offers. Mirrored in YarneBack Services/ForeignDelivery.cs. */
export type DeliveryCountry = { code: string; uk: string; en: string; dial: string };

export const NOVA_POST_COUNTRIES: readonly DeliveryCountry[] = [
  { code: "PL", uk: "Польща", en: "Poland", dial: "+48" },
  { code: "DE", uk: "Німеччина", en: "Germany", dial: "+49" },
  { code: "CZ", uk: "Чехія", en: "Czechia", dial: "+420" },
  { code: "LT", uk: "Литва", en: "Lithuania", dial: "+370" },
  { code: "LV", uk: "Латвія", en: "Latvia", dial: "+371" },
  { code: "EE", uk: "Естонія", en: "Estonia", dial: "+372" },
  { code: "MD", uk: "Молдова", en: "Moldova", dial: "+373" },
  { code: "RO", uk: "Румунія", en: "Romania", dial: "+40" },
  { code: "SK", uk: "Словаччина", en: "Slovakia", dial: "+421" },
  { code: "HU", uk: "Угорщина", en: "Hungary", dial: "+36" },
  { code: "IT", uk: "Італія", en: "Italy", dial: "+39" },
  { code: "ES", uk: "Іспанія", en: "Spain", dial: "+34" },
  { code: "FR", uk: "Франція", en: "France", dial: "+33" },
  { code: "GB", uk: "Велика Британія", en: "United Kingdom", dial: "+44" },
  { code: "AT", uk: "Австрія", en: "Austria", dial: "+43" },
  { code: "NL", uk: "Нідерланди", en: "Netherlands", dial: "+31" },
];

export const countryName = (country: DeliveryCountry, locale: Locale) => (locale === "uk" ? country.uk : country.en);

export function findCountry(code: string | null | undefined): DeliveryCountry | undefined {
  return NOVA_POST_COUNTRIES.find((country) => country.code === code?.toUpperCase());
}

const BLOCKED_PARTS = ["russia", "rossiya", "rossija", "russian federation", "росі", "россия", "российская", "belarus", "byelorussia", "білорус", "беларус", "белорус"];

/** Russia and Belarus are never delivered to, in any spelling typed into "Other country" (the server checks again). */
export function isBlockedCountry(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n.length > 0 && (n === "рф" || BLOCKED_PARTS.some((part) => n.includes(part)));
}

/** Latin letters, with the accents of European names, plus the apostrophes, dots, hyphens and spaces names use. */
export function isLatinName(value: string): boolean {
  return /^[\p{Script=Latin}'’.\- ]*$/u.test(value);
}

const NATIONAL_MIN = 6;
const NATIONAL_MAX = 14;

/**
 * The national part of a phone number as the field should hold it: digits only. A pasted or autofilled value that starts with
 * "+", "00" or the chosen country's dial code has that code stripped (so it is never doubled by the prefix the field shows).
 * With no country ("+" only), the whole number is kept, since the shopper types the code themselves.
 */
export function normalizeAbroadPhone(raw: string, dial: string): string {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  const code = dial.replace(/\D/g, "");
  let international = trimmed.startsWith("+");
  if (!international && digits.startsWith("00")) {
    digits = digits.slice(2);
    international = true;
  }
  if (code) {
    if (digits.startsWith(code) && (international || digits.length - code.length >= NATIONAL_MIN)) digits = digits.slice(code.length);
  }
  return digits.slice(0, NATIONAL_MAX);
}

/** Light grouping as the shopper types, 3-3-2-2 then the rest, the same for every country. */
export function formatAbroadPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, NATIONAL_MAX);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10), d.slice(10)].filter(Boolean).join(" ");
}

/** An international number: the dial code plus 6 to 14 national digits (E.164 allows 15 in all). */
export function isInternationalPhone(dial: string, local: string): boolean {
  const digits = local.replace(/\D/g, "");
  return digits.length >= NATIONAL_MIN && digits.length <= NATIONAL_MAX && dial.replace(/\D/g, "").length + digits.length <= 15;
}
