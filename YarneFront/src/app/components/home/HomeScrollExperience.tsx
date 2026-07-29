import React, { useRef } from "react";
import {
  cubicBezier,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
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

/** Tight runway — full story without long empty gaps between beats. */
const STORY_VH = 320;
const STORY_VH_TOUCH = 280;

const EASE_OUT = cubicBezier(0.16, 1, 0.3, 1);

type SideCopy = {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
};

function useSegment(progress: MotionValue<number>, start: number, end: number) {
  return useTransform(progress, [start, end], [0, 1], { clamp: true, ease: EASE_OUT });
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className="uppercase tracking-[0.22em] text-[0.65rem] mb-3"
      style={{
        color: light ? "rgba(255,255,255,0.45)" : `${INK}66`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </p>
  );
}

function DisplayTitle({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <h2
      className="max-w-lg"
      style={{
        color: light ? "#fff" : INK,
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "clamp(1.85rem, 4.2vw, 3.25rem)",
        fontWeight: 400,
        lineHeight: 1.1,
        textWrap: "balance",
      }}
    >
      {children}
    </h2>
  );
}

function BodyCopy({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className="mt-5 max-w-md text-[0.95rem] leading-relaxed"
      style={{
        color: light ? "rgba(255,255,255,0.65)" : `${INK}B3`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </p>
  );
}

/**
 * Full Yarné home story:
 * hero → why (50% → 100%) → showcase → philosophy → side product reveals → final → footer.
 * Sticky stage releases flush so footer follows without a cream gap.
 */
export function HomeScrollExperience({ heroImageUrl }: { heroImageUrl: string }) {
  const copy = useHomePageCopy();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const touch = useTouchMobileLayout();
  const simplify = Boolean(reducedMotion);
  const heroSrc = resolveMediaUrl(heroImageUrl) || heroImageUrl || HOME_SCROLL_IMAGES.craft;

  const whyPoints = t("home.scrollStory.whyPoints", { returnObjects: true }) as string[];
  const sides: SideCopy[] = [
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

  if (simplify) {
    return (
      <div className="relative bg-[#F5F2ED]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <a
          href="#home-story-end"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[90] focus-visible:rounded-full focus-visible:bg-white focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:text-[#2D241E]"
        >
          {t("home.scrollStory.skipToContent")}
        </a>
        <StaticChapter
          image={heroSrc}
          eyebrow={copy.hero.eyebrow}
          title={
            <>
              {copy.hero.titleLine1}
              <br />
              <em className="font-light italic">{copy.hero.titleAccent}</em>
            </>
          }
          body={copy.hero.subtitle}
          overlay
          ctas={[
            { label: copy.hero.ctaPrimary, href: "/collection", solid: true },
            { label: copy.hero.ctaSecondary, href: "/collection?filter=new", solid: false },
          ]}
        />
        <StaticChapter
          image={HOME_SCROLL_IMAGES.craft}
          eyebrow={t("home.scrollStory.whyEyebrow")}
          title={t("home.scrollStory.whyTitle")}
          body={copy.editorial.paragraph2}
        />
        <StaticChapter
          image={HOME_SCROLL_IMAGES.product1}
          eyebrow={copy.showcase.eyebrow}
          title={copy.showcase.title}
          body={copy.featured.title}
          cta={{ label: copy.featured.viewAll, href: "/collection" }}
        />
        <StaticChapter
          image={HOME_SCROLL_IMAGES.product2}
          eyebrow={copy.editorial.eyebrow}
          title={
            <>
              {copy.editorial.titleLine1}
              <br />
              <em className="font-light italic">{copy.editorial.titleLine2}</em>
            </>
          }
          body={copy.editorial.paragraph1}
          overlay
          cta={{ label: copy.editorial.ourStory, href: "/pages/our-history" }}
        />
        {sides.map((s) => (
          <StaticChapter
            key={s.title}
            image={s.image}
            eyebrow={s.eyebrow}
            title={s.title}
            body={s.body}
            cta={{ label: s.cta, href: s.href }}
          />
        ))}
        <StaticChapter
          image={HOME_SCROLL_IMAGES.final}
          eyebrow={copy.lookbook.eyebrow}
          title={
            <>
              {copy.lookbook.titleLine1}
              <br />
              <em className="font-light italic">{copy.lookbook.titleLine2}</em>
            </>
          }
          overlay
          cta={{ label: copy.lookbook.cta, href: "/collection" }}
        />
        <div id="home-story-end" className="h-px w-full scroll-mt-[var(--main-header-h)]" aria-hidden />
      </div>
    );
  }

  return (
    <PinnedStory
      heroSrc={heroSrc}
      copy={copy}
      whyPoints={Array.isArray(whyPoints) ? whyPoints : []}
      whyEyebrow={t("home.scrollStory.whyEyebrow")}
      whyTitle={t("home.scrollStory.whyTitle")}
      sides={sides}
      skipLabel={t("home.scrollStory.skipToContent")}
      touch={touch}
    />
  );
}

function PinnedStory({
  heroSrc,
  copy,
  whyPoints,
  whyEyebrow,
  whyTitle,
  sides,
  skipLabel,
  touch,
}: {
  heroSrc: string;
  copy: ReturnType<typeof useHomePageCopy>;
  whyPoints: string[];
  whyEyebrow: string;
  whyTitle: string;
  sides: SideCopy[];
  skipLabel: string;
  touch: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: touch ? 120 : 95,
    damping: touch ? 30 : 34,
    mass: 0.7,
    restDelta: 0.001,
  });

  // Why: hold hero → rise to half → hold → cover full screen (transform only)
  const whyY = useTransform(
    progress,
    [0, 0.05, 0.12, 0.15, 0.24, 1],
    ["100%", "100%", "50%", "50%", "0%", "0%"],
    { ease: [EASE_OUT, EASE_OUT, EASE_OUT, EASE_OUT, EASE_OUT] },
  );
  const whyCopySeg = useSegment(progress, 0.08, 0.16);
  const whyCopyOp = useTransform(whyCopySeg, [0, 1], [0, 1]);
  const whyCopyY = useTransform(whyCopySeg, [0, 1], [22, 0]);

  // Stack 2 — showcase
  const showSeg = useSegment(progress, 0.28, 0.38);
  const showY = useTransform(showSeg, [0, 1], ["100%", "0%"]);
  const showCopySeg = useSegment(progress, 0.32, 0.42);
  const showCopyOp = useTransform(showCopySeg, [0, 1], [0, 1]);
  const showCopyY = useTransform(showCopySeg, [0, 1], [20, 0]);

  // Stack 3 — philosophy
  const philSeg = useSegment(progress, 0.42, 0.52);
  const philY = useTransform(philSeg, [0, 1], ["100%", "0%"]);
  const philCopySeg = useSegment(progress, 0.46, 0.56);
  const philCopyOp = useTransform(philCopySeg, [0, 1], [0, 1]);
  const philCopyY = useTransform(philCopySeg, [0, 1], [20, 0]);

  // Side product reveals (image L / copy emerges L→R)
  const side1Seg = useSegment(progress, 0.56, 0.66);
  const side2Seg = useSegment(progress, 0.68, 0.78);
  const side3Seg = useSegment(progress, 0.8, 0.9);

  const side1X = useTransform(side1Seg, [0, 1], ["-100%", "0%"]);
  const side2X = useTransform(side2Seg, [0, 1], ["100%", "0%"]);
  const side3X = useTransform(side3Seg, [0, 1], ["-100%", "0%"]);

  const side1TextX = useTransform(side1Seg, [0.25, 1], ["-18%", "0%"]);
  const side2TextX = useTransform(side2Seg, [0.25, 1], ["-18%", "0%"]);
  const side3TextX = useTransform(side3Seg, [0.25, 1], ["-18%", "0%"]);
  const side1TextOp = useTransform(side1Seg, [0.2, 0.65], [0, 1]);
  const side2TextOp = useTransform(side2Seg, [0.2, 0.65], [0, 1]);
  const side3TextOp = useTransform(side3Seg, [0.2, 0.65], [0, 1]);

  // Final — after sides, no overlap clash
  const finalSeg = useSegment(progress, 0.9, 0.98);
  const finalY = useTransform(finalSeg, [0, 1], ["100%", "0%"]);
  const finalCopySeg = useSegment(progress, 0.93, 1);
  const finalCopyOp = useTransform(finalCopySeg, [0, 1], [0, 1]);
  const finalCopyY = useTransform(finalCopySeg, [0, 1], [18, 0]);

  const heroCopyFade = useTransform(progress, [0.06, 0.18], [1, 0], { clamp: true });

  const vh = touch ? STORY_VH_TOUCH : STORY_VH;
  const storyHeight = `calc(var(--app-vh, 1vh) * ${vh})`;

  return (
    <div className="relative bg-[#F5F2ED]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <a
        href="#home-story-end"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[90] focus-visible:rounded-full focus-visible:bg-white focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:text-[#2D241E]"
      >
        {skipLabel}
      </a>

      <div ref={trackRef} className="relative" style={{ height: storyHeight }}>
        <div
          className="sticky top-0 overflow-hidden"
          style={{
            height: "calc(var(--app-vh, 1vh) * 100)",
            backgroundColor: CREAM,
            zIndex: 1,
          }}
          aria-label="Yarné home story"
        >
          {/* Hero */}
          <div className="absolute inset-0 z-[1]">
            <Img
              src={heroSrc}
              alt=""
              priority
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.38) 55%, rgba(45,36,30,0.14) 100%)",
              }}
              aria-hidden
            />
            <motion.div
              className="relative z-10 flex h-full items-end"
              style={{ opacity: heroCopyFade }}
            >
              <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 pb-14 md:pb-20">
                <Eyebrow light>{copy.hero.eyebrow}</Eyebrow>
                <h1
                  className="text-white max-w-2xl"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2.4rem, 7vw, 5rem)",
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
                <BodyCopy light>{copy.hero.subtitle}</BodyCopy>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
                  <LangLink
                    to="/collection"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F5F2ED] px-7 py-3.5 text-[0.75rem] uppercase tracking-[0.16em] text-[#2D241E] transition-colors duration-200 hover:bg-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    {copy.hero.ctaPrimary}
                    <ArrowRight size={14} aria-hidden />
                  </LangLink>
                  <LangLink
                    to="/collection?filter=new"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/35 px-7 py-3.5 text-[0.75rem] uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:border-white/70 hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    {copy.hero.ctaSecondary}
                  </LangLink>
                </div>
              </div>
            </motion.div>
            <div className="absolute bottom-8 right-8 hidden md:flex flex-col items-center gap-2 text-white/45">
              <span
                className="text-[0.62rem] tracking-[0.25em] uppercase"
                style={{ writingMode: "vertical-rl", fontFamily: "'DM Sans', sans-serif" }}
              >
                {copy.hero.scroll}
              </span>
              <ChevronDown size={16} aria-hidden />
            </div>
          </div>

          {/* Why — half screen then full (slides up via y) */}
          <motion.div
            className="absolute inset-0 z-[2] overflow-hidden will-change-transform"
            style={{ y: whyY, backgroundColor: CREAM }}
          >
            <div className="grid h-full min-h-0 md:grid-cols-2">
              <div className="relative min-h-0">
                <Img
                  src={HOME_SCROLL_IMAGES.craft}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <motion.div
                className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-6 md:py-8"
                style={{ opacity: whyCopyOp, y: whyCopyY }}
              >
                <Eyebrow>{whyEyebrow}</Eyebrow>
                <DisplayTitle>{whyTitle}</DisplayTitle>
                <BodyCopy>{copy.editorial.paragraph2}</BodyCopy>
                <ul
                  className="mt-7 grid grid-cols-2 gap-3 max-w-md text-[0.7rem] uppercase tracking-[0.14em]"
                  style={{ color: `${INK}99`, fontFamily: "'DM Sans', sans-serif" }}
                >
                  {whyPoints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>

          {/* Showcase stack */}
          <motion.div
            className="absolute inset-0 z-[3] will-change-transform"
            style={{ y: showY, backgroundColor: SAND }}
          >
            <div className="grid h-full md:grid-cols-2">
              <motion.div
                className="order-2 md:order-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8"
                style={{ opacity: showCopyOp, y: showCopyY }}
              >
                <Eyebrow>{copy.showcase.eyebrow}</Eyebrow>
                <DisplayTitle>{copy.showcase.title}</DisplayTitle>
                <BodyCopy>{copy.featured.title}</BodyCopy>
                <LangLink
                  to="/collection"
                  className="mt-8 inline-flex items-center gap-2 self-start text-[0.72rem] uppercase tracking-[0.16em] text-[#2D241E]/70 transition-colors duration-200 hover:text-[#4A0E0E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
                >
                  {copy.featured.viewAll}
                  <ArrowRight size={14} aria-hidden />
                </LangLink>
              </motion.div>
              <div className="relative order-1 md:order-2 min-h-0">
                <Img
                  src={HOME_SCROLL_IMAGES.product1}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
          </motion.div>

          {/* Philosophy stack */}
          <motion.div
            className="absolute inset-0 z-[4] will-change-transform"
            style={{ y: philY, backgroundColor: INK }}
          >
            <div className="grid h-full md:grid-cols-2">
              <div className="relative min-h-0">
                <Img
                  src={HOME_SCROLL_IMAGES.product2}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-90"
                />
              </div>
              <motion.div
                className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8 text-white"
                style={{ opacity: philCopyOp, y: philCopyY }}
              >
                <Eyebrow light>{copy.editorial.eyebrow}</Eyebrow>
                <DisplayTitle light>
                  {copy.editorial.titleLine1}
                  <br />
                  <em className="font-light italic">{copy.editorial.titleLine2}</em>
                </DisplayTitle>
                <BodyCopy light>{copy.editorial.paragraph1}</BodyCopy>
                <LangLink
                  to="/pages/our-history"
                  className="mt-8 inline-flex items-center gap-2 self-start text-[0.72rem] uppercase tracking-[0.16em] text-white/70 transition-colors duration-200 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {copy.editorial.ourStory}
                  <ArrowRight size={14} aria-hidden />
                </LangLink>
              </motion.div>
            </div>
          </motion.div>

          <SideLayer
            z={5}
            panel={sides[0]}
            frameX={side1X}
            textX={side1TextX}
            textOp={side1TextOp}
          />
          <SideLayer
            z={6}
            panel={sides[1]}
            frameX={side2X}
            textX={side2TextX}
            textOp={side2TextOp}
          />
          <SideLayer
            z={7}
            panel={sides[2]}
            frameX={side3X}
            textX={side3TextX}
            textOp={side3TextOp}
          />

          {/* Final lookbook */}
          <motion.div
            className="absolute inset-0 z-[8] overflow-hidden will-change-transform"
            style={{ y: finalY }}
          >
            <Img
              src={HOME_SCROLL_IMAGES.final}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, rgba(45,36,30,0.4) 0%, rgba(45,36,30,0.75) 100%)",
              }}
              aria-hidden
            />
            <motion.div
              className="relative z-10 flex h-full items-center justify-center px-6 text-center text-white"
              style={{ opacity: finalCopyOp, y: finalCopyY }}
            >
              <div className="max-w-[900px]">
                <Eyebrow light>{copy.lookbook.eyebrow}</Eyebrow>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2.2rem, 5.5vw, 4rem)",
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
                  className="mt-10 inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-8 py-3.5 text-[0.75rem] uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {copy.lookbook.cta}
                  <ArrowRight size={14} aria-hidden />
                </LangLink>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div id="home-story-end" className="h-px w-full scroll-mt-[var(--main-header-h)]" aria-hidden />
    </div>
  );
}

function SideLayer({
  z,
  panel,
  frameX,
  textX,
  textOp,
}: {
  z: number;
  panel: SideCopy;
  frameX: MotionValue<string>;
  textX: MotionValue<string>;
  textOp: MotionValue<number>;
}) {
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden will-change-transform"
      style={{ zIndex: z, x: frameX, backgroundColor: CREAM }}
    >
      <div className="grid h-full md:grid-cols-2">
        <div className="relative min-h-0 order-1">
          <Img src={panel.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <motion.div
          className="order-2 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8"
          style={{ x: textX, opacity: textOp }}
        >
          <Eyebrow>{panel.eyebrow}</Eyebrow>
          <DisplayTitle>{panel.title}</DisplayTitle>
          <BodyCopy>{panel.body}</BodyCopy>
          <LangLink
            to={panel.href}
            className="mt-8 inline-flex items-center gap-2 self-start rounded-full px-6 py-3 text-[0.72rem] uppercase tracking-[0.16em] text-white transition-opacity duration-200 hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35"
            style={{ backgroundColor: ACCENT, fontFamily: "'DM Sans', sans-serif" }}
          >
            {panel.cta}
            <ArrowRight size={14} aria-hidden />
          </LangLink>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StaticChapter({
  image,
  eyebrow,
  title,
  body,
  overlay,
  cta,
  ctas,
}: {
  image: string;
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  overlay?: boolean;
  cta?: { label: string; href: string };
  ctas?: { label: string; href: string; solid: boolean }[];
}) {
  return (
    <section
      className="relative min-h-[100vh] flex items-end md:items-center overflow-hidden"
      style={{ backgroundColor: SAND }}
    >
      <Img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {overlay ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.4) 55%, rgba(45,36,30,0.2) 100%)",
          }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-[#F5F2ED]/88 md:left-1/2 md:bg-[#F5F2ED]" aria-hidden />
      )}
      <div
        className={`relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-10 py-16 ${
          overlay ? "text-white" : "text-[#2D241E] md:ml-auto md:w-1/2"
        }`}
      >
        <Eyebrow light={overlay}>{eyebrow}</Eyebrow>
        <DisplayTitle light={overlay}>{title}</DisplayTitle>
        {body ? <BodyCopy light={overlay}>{body}</BodyCopy> : null}
        {cta ? (
          <LangLink
            to={cta.href}
            className="mt-8 inline-flex items-center gap-2 cursor-pointer text-[0.72rem] uppercase tracking-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
            style={{ color: overlay ? "rgba(255,255,255,0.8)" : `${INK}B3` }}
          >
            {cta.label}
            <ArrowRight size={14} aria-hidden />
          </LangLink>
        ) : null}
        {ctas ? (
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {ctas.map((c) => (
              <LangLink
                key={c.href + c.label}
                to={c.href}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[0.75rem] uppercase tracking-[0.16em] cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                  c.solid
                    ? "bg-[#F5F2ED] text-[#2D241E] focus-visible:ring-white/50"
                    : "border border-white/40 text-white focus-visible:ring-white/50"
                }`}
              >
                {c.label}
              </LangLink>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
