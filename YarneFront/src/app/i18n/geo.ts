// Lightweight, key-less geo-IP probe using ipwho.is.
// Used once per session to pick a default locale before the user has chosen one.

import {
  DEFAULT_LOCALE,
  GEO_COUNTRY_STORAGE_KEY,
  type Locale,
} from "./config";

const GEO_ENDPOINT = "https://ipwho.is/";
const GEO_TIMEOUT_MS = 2500;

type CachedGeo = {
  country: string;
  at: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readCachedCountry(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(GEO_COUNTRY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedGeo;
    if (
      typeof parsed?.country === "string" &&
      typeof parsed?.at === "number" &&
      Date.now() - parsed.at < CACHE_TTL_MS
    ) {
      return parsed.country;
    }
  } catch {
    // ignore — bad cache shape
  }
  return null;
}

function writeCachedCountry(country: string): void {
  if (typeof window === "undefined") return;
  const payload: CachedGeo = { country, at: Date.now() };
  try {
    window.sessionStorage.setItem(
      GEO_COUNTRY_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // ignore — storage may be full or disabled
  }
}

/** Returns ISO-3166-1 alpha-2 country code or null on any failure / timeout. */
export async function detectCountry(): Promise<string | null> {
  const cached = readCachedCountry();
  if (cached) return cached;

  if (typeof fetch === "undefined") return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

  try {
    const res = await fetch(GEO_ENDPOINT, {
      signal: controller.signal,
      // ipwho.is returns JSON over HTTPS without auth; CORS is permissive.
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
    };
    if (data?.success === false) return null;
    const code = data?.country_code?.toUpperCase() ?? null;
    if (code) writeCachedCountry(code);
    return code;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Map country to a supported locale. UA → 'uk', everything else → English. */
export function localeForCountry(country: string | null): Locale {
  if (country?.toUpperCase() === "UA") return "uk";
  return DEFAULT_LOCALE;
}
