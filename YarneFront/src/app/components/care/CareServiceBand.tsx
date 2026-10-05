import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { LangLink } from "../../i18n/LangLink";
import { useLocale } from "../../i18n/useLocale";
import { peekStorefrontSetting } from "../../api/storefrontSettings";
import { firstVisitRevealStyle, useFirstVisitReady } from "../../hooks/useFirstVisitReady";
import { useSeenLock } from "../../hooks/useSeenLock";
import {
  getInitialWhySectionContent,
  loadWhySectionContent,
  WHY_SECTION_KEY,
  type WhySectionContent,
} from "../../utils/whySectionContent";
import { EYEBROW, LABEL, SANS, SERIF } from "./careUi";

/** "Yarné Care — we look after…" → "We look after…": the name is already the band's eyebrow. */
function headline(title: string, word: string): string {
  const rest = title.startsWith(word) ? title.slice(word.length).replace(/^\s*[—–:-]\s*/, "") : title;
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : title;
}

/**
 * The dark "Yarné Care" service panel (we re-knit it / we wash it / free returns). Its copy is
 * the home page's Why section's closing step, edited in Admin → Contents.
 */
export function CareServiceBand() {
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState<WhySectionContent>(getInitialWhySectionContent);

  useEffect(() => {
    let cancelled = false;
    void loadWhySectionContent().then((next) => {
      if (!cancelled) setLoaded(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Like the home page's Why section: hidden on a first visit until the admin's copy is in,
  // then kept as the visitor saw it.
  const ready = useFirstVisitReady(() => peekStorefrontSetting(WHY_SECTION_KEY) !== undefined, loadWhySectionContent);
  const why = useSeenLock(loaded, ready, ref);
  const care = why[locale].care;

  return (
    <section
      ref={ref}
      aria-busy={!ready}
      className="mx-4 rounded-[28px] px-[22px] py-7 md:mx-10 md:rounded-[32px] md:px-16 md:py-14 flex flex-col gap-4 md:grid md:grid-cols-4 md:gap-10 md:items-start"
      style={{ backgroundColor: "#2D241E", color: "#F5F2ED", ...SANS, ...firstVisitRevealStyle(ready, Boolean(reduceMotion)) }}
    >
      <div className="flex flex-col gap-3">
        <p className={`${EYEBROW} text-[11px] md:text-xs opacity-[0.72]`}>{care.word}</p>
        <h2 className="text-[26px] md:text-[30px] leading-[1.15] font-normal" style={SERIF}>
          {headline(care.title, care.word)}
        </h2>
        <LangLink
          to="/pages/terms"
          className={`hidden md:inline-block self-start mt-2 ${LABEL} text-[11.5px] underline underline-offset-4 text-[#F5F2ED] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2ED]/60 rounded-sm`}
        >
          {care.linkLabel}
        </LangLink>
      </div>

      <div
        className="flex flex-col gap-4 md:contents"
        style={{ borderColor: "rgba(245,242,237,0.16)" }}
      >
        {care.items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 md:gap-2 pt-3.5 border-t md:pl-8 md:pt-0 md:border-t-0 md:border-l"
            style={{ borderColor: "rgba(245,242,237,0.16)" }}
          >
            <p className="text-[20px] md:text-2xl md:leading-normal" style={SERIF}>
              {item.title}
            </p>
            <p className="text-[13.5px] leading-[1.55] md:text-sm md:leading-[1.6] opacity-80">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <LangLink
        to="/pages/terms"
        className={`md:hidden mt-1 h-11 flex items-center justify-center rounded-full border ${LABEL} text-[11px] text-[#F5F2ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2ED]/60`}
        style={{ borderColor: "rgba(245,242,237,0.4)" }}
      >
        {care.linkLabel}
      </LangLink>
    </section>
  );
}
