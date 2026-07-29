import React, { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LangLink } from "../../i18n/LangLink";
import { useHomePageCopy } from "../../hooks/useHomePageCopy";
import { useTouchMobileLayout } from "../../hooks/useTouchMobileLayout";
import { ImageWithFallback as Img } from "../figma/ImageWithFallback";
import { HOME_SCROLL_IMAGES } from "./homeScrollImages";
import { resolveMediaUrl } from "../../utils/storefrontMedia";

const INK = "#2D241E";
const CREAM = "#F5F2ED";
const SAND = "#EDE9E2";
const ACCENT = "#4A0E0E";

type SidePanel = {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
};

function useClampProgress(value: MotionValue<number>, start: number, end: number) {
  return useTransform(value, [start, end], [0, 1], { clamp: true });
}

function HeroStage({
  heroSrc,
  reduced,
}: {
  heroSrc: string;
  reduced: boolean;
}) {
  const copy = useHomePageCopy();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], reduced ? ["0%", "0%"] : ["0%", "18%"]);

  return (
    <section
      ref={ref}
      className="relative flex items-end overflow-hidden"
      style={{ height: "calc(var(--app-vh, 1vh) * 100)", minHeight: 560, backgroundColor: SAND }}
    >
      <motion.div className="absolute inset-0 overflow-hidden" style={{ y: imageY }}>
        {heroSrc ? (
          <Img
            src={heroSrc}
            alt=""
            priority
            className="absolute inset-0 h-[112%] w-full object-cover object-center"
          />
        ) : (
          <Img
            src={HOME_SCROLL_IMAGES.craft}
            alt=""
            priority
            className="absolute inset-0 h-[112%] w-full object-cover object-center"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.38) 55%, rgba(45,36,30,0.14) 100%)",
          }}
          aria-hidden
        />
      </motion.div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-10 pb-14 md:pb-20">
        <p
          className="text-white/65 tracking-[0.28em] uppercase text-[0.65rem] mb-5 md:mb-6"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {copy.hero.eyebrow}
        </p>
        <h1
          className="text-white max-w-2xl"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
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
          className="text-white/70 mt-5 md:mt-6 max-w-md text-[0.95rem] leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {copy.hero.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 md:mt-10 w-full max-w-lg">
          <LangLink
            to="/collection"
            className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#F5F2ED] text-[#2D241E] hover:bg-white transition-colors duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            style={{ fontSize: "0.75rem", letterSpacing: "0.16em" }}
          >
            <span className="uppercase tracking-widest">{copy.hero.ctaPrimary}</span>
            <ArrowRight size={14} aria-hidden className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </LangLink>
          <LangLink
            to="/collection?filter=new"
            className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-full text-white border border-white/35 hover:border-white/70 hover:bg-white/10 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            style={{ fontSize: "0.75rem", letterSpacing: "0.16em" }}
          >
            <span className="uppercase tracking-widest">{copy.hero.ctaSecondary}</span>
          </LangLink>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 md:right-12 hidden md:flex flex-col items-center gap-2 text-white/45">
        <span
          className="text-[0.62rem] tracking-[0.25em] uppercase"
          style={{ writingMode: "vertical-rl", fontFamily: "'DM Sans', sans-serif" }}
        >
          {copy.hero.scroll}
        </span>
        <ChevronDown size={16} aria-hidden className="motion-safe:animate-[bounce-soft_2s_ease-in-out_infinite]" />
      </div>
    </section>
  );
}

function StackPanelShell({
  children,
  bg,
  className = "",
  style,
}: {
  children: React.ReactNode;
  bg: string;
  className?: string;
  style?: React.CSSProperties | { height?: MotionValue<string>; opacity?: MotionValue<number>; zIndex?: number };
}) {
  return (
    <motion.div
      className={`absolute inset-x-0 bottom-0 overflow-hidden ${className}`}
      style={{ backgroundColor: bg, ...style }}
    >
      {children}
    </motion.div>
  );
}

function StackStage({ reduced }: { reduced: boolean }) {
  const copy = useHomePageCopy();
  const { t } = useTranslation();
  const touch = useTouchMobileLayout();
  const trackRef = useRef<HTMLDivElement>(null);
  const whyPoints = t("home.scrollStory.whyPoints", { returnObjects: true }) as string[];
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  // Panel 1: grows from half screen → full
  const p1Progress = useClampProgress(scrollYProgress, 0, 0.28);
  const p1Height = useTransform(p1Progress, [0, 1], ["50%", "100%"]);
  const p1Opacity = useTransform(p1Progress, [0, 0.15, 1], [0.92, 1, 1]);

  // Panel 2 + 3: slide up over previous
  const p2Progress = useClampProgress(scrollYProgress, 0.28, 0.55);
  const p3Progress = useClampProgress(scrollYProgress, 0.55, 0.82);
  const p2Y = useTransform(p2Progress, [0, 1], ["100%", "0%"]);
  const p3Y = useTransform(p3Progress, [0, 1], ["100%", "0%"]);

  if (reduced || touch) {
    return (
      <div className="relative">
        <StaticStackCard
          eyebrow={t("home.scrollStory.whyEyebrow")}
          title={t("home.scrollStory.whyTitle")}
          body={`${copy.editorial.paragraph1}\n\n${copy.editorial.paragraph2}`}
          image={HOME_SCROLL_IMAGES.craft}
          tone="cream"
        />
        <StaticStackCard
          eyebrow={copy.showcase.eyebrow}
          title={copy.showcase.title}
          body={copy.featured.title}
          image={HOME_SCROLL_IMAGES.product1}
          tone="sand"
          cta={{ label: copy.featured.viewAll, href: "/collection" }}
        />
        <StaticStackCard
          eyebrow={copy.editorial.eyebrow}
          title={`${copy.editorial.titleLine1} ${copy.editorial.titleLine2}`}
          body={copy.editorial.paragraph2}
          image={HOME_SCROLL_IMAGES.product2}
          tone="ink"
          cta={{ label: copy.editorial.ourStory, href: "/pages/our-history" }}
        />
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className="relative"
      style={{ height: "calc(var(--app-vh, 1vh) * 340)" }}
      aria-label="Stacked story sections"
    >
      <div className="sticky top-0 h-[100vh] overflow-hidden" style={{ backgroundColor: CREAM }}>
        {/* Layer 1 — value / why buy */}
        <StackPanelShell bg={CREAM} style={{ height: p1Height, zIndex: 1, opacity: p1Opacity }}>
          <div className="h-full grid md:grid-cols-2">
            <div className="relative min-h-[40vh] md:min-h-0">
              <Img
                src={HOME_SCROLL_IMAGES.craft}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-10">
              <p
                className="uppercase tracking-[0.22em] text-[0.65rem] mb-3"
                style={{ color: `${INK}66`, fontFamily: "'DM Sans', sans-serif" }}
              >
                {t("home.scrollStory.whyEyebrow")}
              </p>
              <h2
                className="text-[#2D241E] max-w-md"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(2rem, 4.5vw, 3.4rem)",
                  fontWeight: 400,
                  lineHeight: 1.1,
                  textWrap: "balance",
                }}
              >
                {t("home.scrollStory.whyTitle")}
              </h2>
              <p
                className="mt-5 max-w-md text-[0.95rem] leading-relaxed"
                style={{ color: `${INK}B3`, fontFamily: "'DM Sans', sans-serif" }}
              >
                {copy.editorial.paragraph2}
              </p>
              <ul
                className="mt-8 grid grid-cols-2 gap-4 max-w-md text-[0.72rem] uppercase tracking-[0.14em]"
                style={{ color: `${INK}99`, fontFamily: "'DM Sans', sans-serif" }}
              >
                {(Array.isArray(whyPoints) ? whyPoints : []).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </StackPanelShell>

        {/* Layer 2 — curated showcase */}
        <motion.div className="absolute inset-0 z-[2]" style={{ y: p2Y }}>
          <div className="h-full w-full" style={{ backgroundColor: SAND }}>
            <div className="h-full grid md:grid-cols-2">
              <div className="order-2 md:order-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-10">
                <p
                  className="uppercase tracking-[0.22em] text-[0.65rem] mb-3"
                  style={{ color: `${INK}66`, fontFamily: "'DM Sans', sans-serif" }}
                >
                  {copy.showcase.eyebrow}
                </p>
                <h2
                  className="text-[#2D241E]"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2rem, 4.5vw, 3.4rem)",
                    fontWeight: 400,
                    lineHeight: 1.1,
                    textWrap: "balance",
                  }}
                >
                  {copy.showcase.title}
                </h2>
                <p
                  className="mt-5 max-w-md text-[0.95rem] leading-relaxed"
                  style={{ color: `${INK}B3`, fontFamily: "'DM Sans', sans-serif" }}
                >
                  {copy.featured.title}
                </p>
                <LangLink
                  to="/collection"
                  className="mt-8 inline-flex items-center gap-2 self-start uppercase tracking-[0.16em] text-[0.72rem] text-[#2D241E]/70 hover:text-[#4A0E0E] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
                >
                  {copy.featured.viewAll}
                  <ArrowRight size={14} aria-hidden />
                </LangLink>
              </div>
              <div className="relative order-1 md:order-2 min-h-[42vh] md:min-h-0">
                <Img
                  src={HOME_SCROLL_IMAGES.product1}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Layer 3 — philosophy */}
        <motion.div className="absolute inset-0 z-[3]" style={{ y: p3Y }}>
          <div className="h-full w-full" style={{ backgroundColor: INK }}>
            <div className="h-full grid md:grid-cols-2">
              <div className="relative min-h-[42vh] md:min-h-0">
                <Img
                  src={HOME_SCROLL_IMAGES.product2}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-90"
                />
              </div>
              <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-10 text-white">
                <p
                  className="uppercase tracking-[0.22em] text-[0.65rem] mb-3 text-white/45"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {copy.editorial.eyebrow}
                </p>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2rem, 4.5vw, 3.4rem)",
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
                  className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white/65"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {copy.editorial.paragraph1}
                </p>
                <LangLink
                  to="/pages/our-history"
                  className="mt-8 inline-flex items-center gap-2 self-start uppercase tracking-[0.16em] text-[0.72rem] text-white/70 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {copy.editorial.ourStory}
                  <ArrowRight size={14} aria-hidden />
                </LangLink>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StaticStackCard({
  eyebrow,
  title,
  body,
  image,
  tone,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  tone: "cream" | "sand" | "ink";
  cta?: { label: string; href: string };
}) {
  const bg = tone === "ink" ? INK : tone === "sand" ? SAND : CREAM;
  const text = tone === "ink" ? "#fff" : INK;
  const muted = tone === "ink" ? "rgba(255,255,255,0.65)" : `${INK}B3`;

  return (
    <section className="min-h-[100vh] grid md:grid-cols-2" style={{ backgroundColor: bg }}>
      <div className="relative min-h-[45vh] md:min-h-0">
        <Img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="flex flex-col justify-center px-6 md:px-12 py-12" style={{ color: text }}>
        <p
          className="uppercase tracking-[0.22em] text-[0.65rem] mb-3"
          style={{ color: muted, fontFamily: "'DM Sans', sans-serif" }}
        >
          {eyebrow}
        </p>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
            fontWeight: 400,
            lineHeight: 1.1,
            textWrap: "balance",
          }}
        >
          {title}
        </h2>
        <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed whitespace-pre-line" style={{ color: muted, fontFamily: "'DM Sans', sans-serif" }}>
          {body}
        </p>
        {cta ? (
          <LangLink
            to={cta.href}
            className="mt-8 inline-flex items-center gap-2 self-start uppercase tracking-[0.16em] text-[0.72rem] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
            style={{ color: muted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {cta.label}
            <ArrowRight size={14} aria-hidden />
          </LangLink>
        ) : null}
      </div>
    </section>
  );
}

function SideRevealPanel({
  panel,
  reduced,
  reverse = false,
}: {
  panel: SidePanel;
  reduced: boolean;
  reverse?: boolean;
}) {
  const touch = useTouchMobileLayout();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const textX = useTransform(
    scrollYProgress,
    [0.15, 0.45],
    reduced || touch ? ["0%", "0%"] : reverse ? ["40%", "0%"] : ["-35%", "0%"],
  );
  const textOpacity = useTransform(scrollYProgress, [0.12, 0.35], reduced || touch ? [1, 1] : [0, 1]);
  const imageScale = useTransform(scrollYProgress, [0.1, 0.5], reduced || touch ? [1, 1] : [1.06, 1]);

  return (
    <div
      ref={ref}
      className="relative"
      style={{ height: reduced || touch ? "auto" : "calc(var(--app-vh, 1vh) * 160)" }}
    >
      <div
        className={`${reduced || touch ? "relative" : "sticky top-0"} h-auto md:h-[100vh] overflow-hidden`}
        style={{ backgroundColor: CREAM, minHeight: reduced || touch ? undefined : "100vh" }}
      >
        <div
          className={`h-full grid md:grid-cols-2 ${
            reverse ? "md:[&>*:first-child]:order-2" : ""
          }`}
        >
          <motion.div className="relative min-h-[48vh] md:min-h-full overflow-hidden" style={{ scale: imageScale }}>
            <Img
              src={panel.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-y-0 right-0 w-8 md:w-16 pointer-events-none"
              style={{
                background: reverse
                  ? undefined
                  : `linear-gradient(90deg, transparent, ${CREAM})`,
              }}
              aria-hidden
            />
          </motion.div>

          <motion.div
            className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12 md:py-16 relative z-10"
            style={{ x: textX, opacity: textOpacity, backgroundColor: CREAM }}
          >
            <p
              className="uppercase tracking-[0.22em] text-[0.65rem] mb-3"
              style={{ color: `${INK}66`, fontFamily: "'DM Sans', sans-serif" }}
            >
              {panel.eyebrow}
            </p>
            <h2
              className="text-[#2D241E] max-w-lg"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1.9rem, 4vw, 3.1rem)",
                fontWeight: 400,
                lineHeight: 1.12,
                textWrap: "balance",
              }}
            >
              {panel.title}
            </h2>
            <p
              className="mt-5 max-w-md text-[0.95rem] leading-relaxed"
              style={{ color: `${INK}B3`, fontFamily: "'DM Sans', sans-serif" }}
            >
              {panel.body}
            </p>
            <LangLink
              to={panel.href}
              className="mt-8 inline-flex items-center gap-2 self-start rounded-full px-6 py-3 text-[0.72rem] uppercase tracking-[0.16em] text-white transition-colors duration-200 cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35"
              style={{ backgroundColor: ACCENT, fontFamily: "'DM Sans', sans-serif" }}
            >
              {panel.cta}
              <ArrowRight size={14} aria-hidden />
            </LangLink>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function FinalStage({ reduced }: { reduced: boolean }) {
  const copy = useHomePageCopy();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ["0%", "0%"] : ["8%", "-6%"]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden flex items-center"
      style={{ minHeight: "calc(var(--app-vh, 1vh) * 92)", backgroundColor: SAND }}
    >
      <motion.div className="absolute inset-0" style={{ y }}>
        <Img
          src={HOME_SCROLL_IMAGES.final}
          alt=""
          className="absolute inset-0 h-[120%] w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(45,36,30,0.45) 0%, rgba(45,36,30,0.72) 100%)" }}
          aria-hidden
        />
      </motion.div>
      <div className="relative z-10 mx-auto max-w-[900px] px-6 py-24 text-center text-white">
        <p
          className="uppercase tracking-[0.28em] text-[0.65rem] text-white/55 mb-5"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {copy.lookbook.eyebrow}
        </p>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2.4rem, 6vw, 4.2rem)",
            fontWeight: 400,
            lineHeight: 1.08,
            textWrap: "balance",
          }}
        >
          {copy.lookbook.titleLine1}
          <br />
          <em className="font-light italic">{copy.lookbook.titleLine2}</em>
        </h2>
        <LangLink
          to="/collection"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-8 py-3.5 text-[0.75rem] uppercase tracking-[0.16em] text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {copy.lookbook.cta}
          <ArrowRight size={14} aria-hidden />
        </LangLink>
      </div>
    </section>
  );
}

export function HomeScrollExperience({ heroImageUrl }: { heroImageUrl: string }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const touch = useTouchMobileLayout();
  const reduced = Boolean(reducedMotion);
  const heroSrc = resolveMediaUrl(heroImageUrl) || heroImageUrl;

  const sidePanels: SidePanel[] = [
    {
      image: HOME_SCROLL_IMAGES.product1,
      eyebrow: t("home.scrollStory.side1Eyebrow"),
      title: t("home.scrollStory.side1Title"),
      body: t("home.scrollStory.side1Body"),
      cta: t("home.scrollStory.side1Cta"),
      href: "/collection",
    },
    {
      image: HOME_SCROLL_IMAGES.product2,
      eyebrow: t("home.scrollStory.side2Eyebrow"),
      title: t("home.scrollStory.side2Title"),
      body: t("home.scrollStory.side2Body"),
      cta: t("home.scrollStory.side2Cta"),
      href: "/collection?filter=new",
    },
    {
      image: HOME_SCROLL_IMAGES.product3,
      eyebrow: t("home.scrollStory.side3Eyebrow"),
      title: t("home.scrollStory.side3Title"),
      body: t("home.scrollStory.side3Body"),
      cta: t("home.scrollStory.side3Cta"),
      href: "/collection?filter=bestseller",
    },
  ];

  return (
    <div className="relative bg-[#F5F2ED]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <a
        href="#home-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-[#2D241E]"
      >
        {t("home.scrollStory.skipToContent")}
      </a>
      <div id="home-main">
        <HeroStage heroSrc={heroSrc} reduced={reduced || touch} />
        <StackStage reduced={reduced} />
        {sidePanels.map((panel, i) => (
          <SideRevealPanel
            key={panel.title}
            panel={panel}
            reduced={reduced}
            reverse={i % 2 === 1}
          />
        ))}
        <FinalStage reduced={reduced || touch} />
      </div>
    </div>
  );
}
