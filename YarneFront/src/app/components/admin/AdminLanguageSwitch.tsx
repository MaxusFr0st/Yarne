import React from "react";

export type TextLanguage = "uk" | "en";

const OPTIONS: { value: TextLanguage; label: string }[] = [
  { value: "uk", label: "Українська" },
  { value: "en", label: "English" },
];

type AdminLanguageSwitchProps = {
  value: TextLanguage;
  onChange: (language: TextLanguage) => void;
  label?: string;
};

/** Two-language switch for admin text fields: same label and border look as AdminLanguageSelect, but both choices stay in view. */
export function AdminLanguageSwitch({ value, onChange, label = "Language" }: AdminLanguageSwitchProps) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <span className="text-[#2D241E]/55 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}:
      </span>
      <div className="inline-flex rounded-[14px] border p-0.5" style={{ borderColor: "rgba(45,36,30,0.15)" }}>
        {OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`cursor-pointer rounded-[12px] px-3.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E] motion-reduce:transition-none ${
                active ? "bg-[#2D241E] text-[#F5F2ED]" : "text-[#2D241E]/60 hover:bg-[#2D241E]/5"
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
