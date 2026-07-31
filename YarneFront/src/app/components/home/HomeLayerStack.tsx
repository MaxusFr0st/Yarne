import React, { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LangLink } from "../../i18n/LangLink";
import { useHomePageCopy } from "../../hooks/useHomePageCopy";
import { useTouchMobileLayout } from "../../hooks/useTouchMobileLayout";
import { ImageWithFallback as Img } from "../figma/ImageWithFallback";
import { YARNE, YARNE_FONT_DISPLAY, YARNE_FONT_UI } from "../../brand/yarneBrand";

const EASE = [0.22, 1, 0.36, 1] as const;

type LayerCopy = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

/** Fade + soft rise when the sticky layer is in view. */
function LayerReveal({ children, className = "", delay = 0 }: LayerCopy) {
  const reduced = useReducedMotion();
  const touch = useTouchMobileLayout();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35, once: false });

  if (reduced) {
    return (
      <div className={className} ref={ref}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: touch ? 16 : 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0.35, y: touch ? 10 : 18 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * From-scratch sticky overlay chapters for the Yarné home.
 * Each full-viewport layer pins and is covered by the next as you scroll —
 * not the scrub engine from the new-design branch.
 */
export function HomeLayerStack({
  heroImageUrl,
  editorialImageUrl,
  lookbookImageUrl,
}: {
  heroImageUrl: string;
  editorialImageUrl: string;
  lookbookImageUrl: string;
}) {
  const copy = useHomePageCopy();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const whyRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: whyProgress } = useScroll({
    target: whyRef,
    offset: ["start end", "end start"],
  });

  // First stacked layer: rises to half, then fills the screen
  const whyCover = useTransform(
    whyProgress,
    [0.15, 0.35, 0.45, 0.65],
    reduced ? ["100%", "100%", "0%", "0%"] : ["100%", "50%", "50%", "0%"],
  );

  const trust = [
    t("product.trust.wash"),
    t("product.trust.repair"),
    t("product.trust.keep"),
  ];

  const layerH = "calc(var(--app-vh, 1vh) * 100)";

  return (
    <div className="relative" style={{ backgroundColor: YARNE.cream }}>
      {/* ── Hero (pins until covered) ── */}
      <section className="sticky top-0 z-[1] flex items-end overflow-hidden" style={{ height: layerH }}>
        <div className="absolute inset-0">
          {heroImageUrl ? (
            <Img
              src={heroImageUrl}
              alt=""
              priority
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(145deg, ${YARNE.mocha} 0%, ${YARNE.clay} 55%, ${YARNE.sand} 100%)` }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.38) 55%, rgba(45,36,30,0.12) 100%)",
            }}
            aria-hidden
          />
        </div>

        <LayerReveal className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-10 pb-14 md:pb-20">
          <p
            className="text-white/65 tracking-[0.28em] uppercase text-[0.65rem] mb-5"
            style={{ fontFamily: YARNE_FONT_UI }}
          >
            {copy.hero.eyebrow}
          </p>
          <h1
            className="text-white max-w-2xl"
            style={{
              fontFamily: YARNE_FONT_DISPLAY,
              fontSize: "clamp(2.6rem, 8vw, 5.25rem)",
              fontWeight: 400,
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            {copy.hero.titleLine1}
            <br />
            <em className="font-light italic">{copy.hero.titleAccent}</em>
          </h1>
          <p
            className="text-white/70 mt-5 max-w-md text-[0.95rem] leading-relaxed"
            style={{ fontFamily: YARNE_FONT_UI }}
          >
            {copy.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-lg">
            <LangLink
              to="/collection"
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[0.75rem] uppercase tracking-[0.16em] transition-colors duration-200 hover:bg-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              style={{ backgroundColor: YARNE.cream, color: YARNE.ink, fontFamily: YARNE_FONT_UI }}
            >
              {copy.hero.ctaPrimary}
              <ArrowRight size={14} aria-hidden />
            </LangLink>
            <LangLink
              to="/collection?filter=new"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/35 px-7 py-3.5 text-[0.75rem] uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:border-white/70 hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              style={{ fontFamily: YARNE_FONT_UI }}
            >
              {copy.hero.ctaSecondary}
            </LangLink>
          </div>
        </LayerReveal>

        <div className="absolute bottom-8 right-8 hidden md:flex flex-col items-center gap-2 text-white/45">
          <span
            className="text-[0.62rem] tracking-[0.25em] uppercase"
            style={{ writingMode: "vertical-rl", fontFamily: YARNE_FONT_UI }}
          >
            {copy.hero.scroll}
          </span>
          <ChevronDown size={16} aria-hidden className="motion-reduce:animate-none animate-[bounce-soft_2s_ease-in-out_infinite]" />
        </div>
      </section>

      {/* Spacer so hero stays pinned while why sheet rises */}
      <div ref={whyRef} className="relative z-[2]" style={{ height: "calc(var(--app-vh, 1vh) * 160)" }}>
        <div className="sticky top-0 overflow-hidden" style={{ height: layerH }}>
          <motion.div
            className="absolute inset-x-0 bottom-0 overflow-hidden will-change-transform"
            style={{
              y: whyCover,
              height: "100%",
              backgroundColor: YARNE.cream,
            }}
          >
            <div className="grid h-full md:grid-cols-2">
              <div className="relative min-h-0 bg-[var(--yarne-sand)]">
                {editorialImageUrl ? (
                  <Img
                    src={editorialImageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0" style={{ backgroundColor: YARNE.sand }} />
                )}
              </div>
              <LayerReveal className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-10" delay={0.08}>
                <p
                  className="uppercase tracking-[0.22em] text-[0.65rem] mb-3"
                  style={{ color: YARNE.mocha, fontFamily: YARNE_FONT_UI }}
                >
                  {copy.editorial.eyebrow}
                </p>
                <h2
                  className="max-w-lg"
                  style={{
                    color: YARNE.ink,
                    fontFamily: YARNE_FONT_DISPLAY,
                    fontSize: "clamp(1.85rem, 4.2vw, 3.25rem)",
                    fontWeight: 400,
                    lineHeight: 1.1,
                    textWrap: "balance",
                  }}
                >
                  {copy.editorial.titleLine1}
                  <br />
                  <em className="font-light italic">{copy.editorial.titleLine2}</em>
                </h2>
                <p
                  className="mt-5 max-w-md text-[0.95rem] leading-relaxed"
                  style={{ color: YARNE.muted, fontFamily: YARNE_FONT_UI }}
                >
                  {copy.editorial.paragraph2}
                </p>
                <ul
                  className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.7rem] uppercase tracking-[0.14em]"
                  style={{ color: YARNE.mocha, fontFamily: YARNE_FONT_UI }}
                >
                  {trust.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <LangLink
                  to="/pages/our-history"
                  className="mt-8 inline-flex items-center gap-2 self-start text-[0.72rem] uppercase tracking-[0.16em] transition-colors duration-200 hover:opacity-80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
                  style={{ color: YARNE.cta, fontFamily: YARNE_FONT_UI }}
                >
                  {copy.editorial.ourStory}
                  <ArrowRight size={14} aria-hidden />
                </LangLink>
              </LayerReveal>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Philosophy overlay ── */}
      <section
        className="sticky top-0 z-[3] overflow-hidden"
        style={{ height: layerH, backgroundColor: YARNE.ink }}
      >
        <div className="grid h-full md:grid-cols-2">
          <div className="relative min-h-0 order-1">
            {editorialImageUrl ? (
              <Img
                src={editorialImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
            ) : null}
            <div className="absolute inset-0 bg-[#2D241E]/35" aria-hidden />
          </div>
          <LayerReveal className="order-2 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-10 text-white" delay={0.06}>
            <p
              className="uppercase tracking-[0.22em] text-[0.65rem] mb-3 text-white/45"
              style={{ fontFamily: YARNE_FONT_UI }}
            >
              {copy.editorial.eyebrow}
            </p>
            <h2
              className="max-w-lg"
              style={{
                fontFamily: YARNE_FONT_DISPLAY,
                fontSize: "clamp(1.85rem, 4.2vw, 3.25rem)",
                fontWeight: 400,
                lineHeight: 1.1,
                textWrap: "balance",
              }}
            >
              {copy.editorial.titleLine1}
              <br />
              <em className="font-light italic">{copy.editorial.titleLine2}</em>
            </h2>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white/65" style={{ fontFamily: YARNE_FONT_UI }}>
              {copy.editorial.paragraph1}
            </p>
          </LayerReveal>
        </div>
      </section>

      {/* ── Lookbook overlay (last pin before shop) ── */}
      <section className="sticky top-0 z-[4] overflow-hidden" style={{ height: layerH }}>
        <div className="absolute inset-0">
          {lookbookImageUrl ? (
            <Img src={lookbookImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ backgroundColor: YARNE.mocha }} />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(45,36,30,0.35) 0%, rgba(45,36,30,0.78) 100%)" }}
            aria-hidden
          />
        </div>
        <LayerReveal className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <p
            className="text-white/55 tracking-[0.28em] uppercase text-[0.65rem] mb-4"
            style={{ fontFamily: YARNE_FONT_UI }}
          >
            {copy.lookbook.eyebrow}
          </p>
          <h2
            style={{
              fontFamily: YARNE_FONT_DISPLAY,
              fontSize: "clamp(2rem, 5.5vw, 3.75rem)",
              fontWeight: 400,
              lineHeight: 1.12,
              textWrap: "balance",
            }}
          >
            {copy.lookbook.titleLine1}
            <br />
            <em className="font-light italic">{copy.lookbook.titleLine2}</em>
          </h2>
          <LangLink
            to="/collection"
            className="mt-10 inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-9 py-3.5 text-[0.75rem] uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            style={{ fontFamily: YARNE_FONT_UI }}
          >
            {copy.lookbook.cta}
            <ArrowRight size={14} aria-hidden />
          </LangLink>
        </LayerReveal>
      </section>

      {/* Push so last sticky can release into the shop below */}
      <div className="relative z-[5] h-[30vh]" style={{ backgroundColor: YARNE.cream }} aria-hidden />
    </div>
  );
}
