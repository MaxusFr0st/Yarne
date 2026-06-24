// Compact EN / UA toggle. Persists the user's choice to localStorage so
// future visits skip the geo-IP probe and respect their explicit pick.

import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  LOCALE_DISPLAY,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type Locale,
} from "./config";
import { stripLocaleFromPath } from "./useLocale";
import { preserveScrollForLocaleSwitch } from "./localeNavigation";

type Variant = "compact" | "full";

type LanguageSwitcherProps = {
  variant?: Variant;
  className?: string;
};

// Brand-standard easing used across micro-interactions on this site.
const TEXT_EASING = [0.25, 0.1, 0.25, 1] as const;

export function LanguageSwitcher({
  variant = "compact",
  className,
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const active = (SUPPORTED_LOCALES as readonly string[]).includes(i18n.language)
    ? (i18n.language as Locale)
    : "en";

  // Scope the shared-layout id by variant so the desktop (compact) and the
  // mobile-drawer (full) switchers never try to animate against each other.
  const indicatorLayoutId = `language-switcher-indicator-${variant}`;

  const change = (next: Locale) => {
    if (next === active) return;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // ignore — storage may be disabled
      }
      preserveScrollForLocaleSwitch();
    }
    void i18n.changeLanguage(next);
    const rest = stripLocaleFromPath(location.pathname);
    const target = `/${next}${rest === "/" ? "" : rest}${location.search}${location.hash}`;
    navigate(target || `/${next}`, { replace: true });
  };

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={`flex items-center gap-1 ${className ?? ""}`.trim()}
      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
    >
      {SUPPORTED_LOCALES.map((code) => {
        const display = LOCALE_DISPLAY[code];
        const isActive = code === active;
        return (
          <button
            key={code}
            type="button"
            onClick={() => change(code)}
            aria-pressed={isActive}
            aria-label={display.native}
            title={display.native}
            className="relative text-xs uppercase tracking-widest px-1.5 py-0.5 cursor-pointer bg-transparent border-0 rounded-[2px] focus:outline-none focus-visible:[outline:2px_solid_#2D241E] focus-visible:[outline-offset:2px]"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <motion.span
              className="relative z-10 inline-block"
              animate={{
                color: isActive ? "#2D241E" : "rgba(45,36,30,0.45)",
              }}
              transition={{ duration: 0.25, ease: TEXT_EASING }}
            >
              {variant === "full" ? display.native : display.short}
            </motion.span>
            {isActive && (
              <motion.span
                layoutId={indicatorLayoutId}
                aria-hidden="true"
                className="absolute left-1 right-1 -bottom-[1px] block"
                style={{
                  height: "1.5px",
                  backgroundColor: "#2D241E",
                  borderRadius: "1px",
                }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 32,
                  mass: 0.6,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
