// i18next bootstrap.
// Initialised eagerly so `t()` is safe to call from any module on first import.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en";
import uk from "./locales/uk";
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  isLocale,
} from "./config";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
    },
    supportedLngs: SUPPORTED_LOCALES,
    fallbackLng: FALLBACK_LOCALE,
    lng: DEFAULT_LOCALE, // Will be overridden by URL/storage during boot.
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    returnNull: false,
    detection: {
      // Absolute default is Ukrainian (`DEFAULT_LOCALE`) until the user picks a language.
      // Do not use navigator — UA language must not override the site default.
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
    react: { useSuspense: false },
  });

// Mirror the language in a cookie (the server cannot read localStorage): yarne-acc.com/ is then
// sent to /en for a visitor who uses English, and to /uk for everyone else, before any script runs.
function rememberLocale(lng: string | undefined) {
  const locale = lng?.split("-")[0];
  if (typeof document === "undefined" || !isLocale(locale)) return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
}
i18n.on("languageChanged", rememberLocale);
try {
  rememberLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? undefined);
} catch {
  // storage may be disabled
}

export default i18n;
export { LOCALE_STORAGE_KEY };
