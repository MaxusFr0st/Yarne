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
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
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

export default i18n;
export { LOCALE_STORAGE_KEY };
