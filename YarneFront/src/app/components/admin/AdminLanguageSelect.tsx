import React from "react";
import { SUPPORTED_LOCALES, LOCALE_DISPLAY, type Locale } from "../../i18n/config";

type AdminLanguageSelectProps = {
  value: Locale;
  onChange: (locale: Locale) => void;
};

export function AdminLanguageSelect({ value, onChange }: AdminLanguageSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Locale)}
      className="rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none cursor-pointer"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.85rem",
        borderColor: "rgba(45,36,30,0.15)",
      }}
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {LOCALE_DISPLAY[locale].native}
        </option>
      ))}
    </select>
  );
}
