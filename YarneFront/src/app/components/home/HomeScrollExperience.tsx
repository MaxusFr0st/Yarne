import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
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

/** Scroll length of the pinned story, in viewport-height units. */
const STORY_VH = 640;

type SideCopy = {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
};

function useSegment(progress: MotionValue<number>, start: number, end: number) {
  return useTransform(progress, [start, end], [0, 1], { clamp: true });
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
 * Fixed full-viewport stage while the story track is scrolling under it.
 * Scroll only scrubs layers — the frame never leaves the screen until the track ends.
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
  const [active, setActive] = useState(true);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // Stay fixed for the whole track; drop after release so footer can take over.
    setActive(v < 0.999);
  });

  useEffect(() => {
    // Lock body sideways scroll-bleed while story is up (no overflow parent needed).
    if (!active) return;
    const prev = document.documentElement.style.overflowX;
    document.documentElement.style.overflowX = "clip";
    return () => {
      document.documentElement.style.overflowX = prev;
    };
  }, [active]);

  const whySeg = useSegment(scrollYProgress, 0.1, 0.22);
  const whyHeight = useTransform(whySeg, [0, 1], ["50%", "100%"]);

  const showSeg = useSegment(scrollYProgress, 0.22, 0.34);
  const showY = useTransform(showSeg, [0, 1], ["100%", "0%"]);

  const philSeg = useSegment(scrollYProgress, 0.34, 0.46);
  const philY = useTransform(philSeg, [0, 1], ["100%", "0%"]);

  const side1Seg = useSegment(scrollYProgress, 0.46, 0.62);
  const side2Seg = useSegment(scrollYProgress, 0.62, 0.78);
  const side3Seg = useSegment(scrollYProgress, 0.78, 0.92);

  const side1X = useTransform(side1Seg, [0, 1], ["100%", "0%"]);
  const side2X = useTransform(side2Seg, [0, 1], ["-100%", "0%"]);
  const side3X = useTransform(side3Seg, [0, 1], ["100%", "0%"]);
  const side1TextX = useTransform(side1Seg, [0.15, 1], ["28%", "0%"]);
  const side2TextX = useTransform(side2Seg, [0.15, 1], ["-28%", "0%"]);
  const side3TextX = useTransform(side3Seg, [0.15, 1], ["28%", "0%"]);
  const side1TextOp = useTransform(side1Seg, [0.1, 0.55], [0, 1]);
  const side2TextOp = useTransform(side2Seg, [0.1, 0.55], [0, 1]);
  const side3TextOp = useTransform(side3Seg, [0.1, 0.55], [0, 1]);

  const finalSeg = useSegment(scrollYProgress, 0.9, 1);
  const finalOp = useTransform(finalSeg, [0, 1], [0, 1]);
  const finalY = useTransform(finalSeg, [0, 1], ["12%", "0%"]);

  const heroFade = useTransform(scrollYProgress, [0.08, 0.2], [1, 0.35]);
  const progressPct = useTransform(scrollYProgress, (v) => `${Math.round(v * 100)}%`);

  const storyHeight = `calc(var(--app-vh, 1vh) * ${touch ? Math.round(STORY_VH * 0.85) : STORY_VH})`;

  return (
    <div className="relative bg-[#F5F2ED]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <a
        href="#home-story-end"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-[#2D241E]"
      >
        {skipLabel}
      </a>

      {/* Invisible scroll runway — length gives scrub room; stage itself is fixed */}
      <div ref={trackRef} style={{ height: storyHeight }} aria-hidden={!active}>
        <div
          className="overflow-hidden"
          style={{
            position: active ? "fixed" : "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "calc(var(--app-vh, 1vh) * 100)",
            zIndex: active ? 30 : 0,
            backgroundColor: CREAM,
            pointerEvents: active ? "auto" : "none",
            visibility: active ? "visible" : "hidden",
          }}
          aria-label="Yarné home story"
        >
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-[40] h-[2px] bg-[#2D241E]/10"
            aria-hidden
          >
            <motion.div className="h-full bg-[#4A0E0E]" style={{ width: progressPct }} />
          </div>

          <motion.div className="absolute inset-0 z-[1]" style={{ opacity: heroFade }}>
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
            <div className="relative z-10 flex h-full items-end">
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
            </div>
            <div className="absolute bottom-8 right-8 hidden md:flex flex-col items-center gap-2 text-white/45">
              <span
                className="text-[0.62rem] tracking-[0.25em] uppercase"
                style={{ writingMode: "vertical-rl", fontFamily: "'DM Sans', sans-serif" }}
              >
                {copy.hero.scroll}
              </span>
              <ChevronDown size={16} aria-hidden />
            </div>
          </motion.div>

          <motion.div
            className="absolute inset-x-0 bottom-0 z-[2] overflow-hidden"
            style={{ height: whyHeight, backgroundColor: CREAM }}
          >
            <div className="grid h-full md:grid-cols-2">
              <div className="relative min-h-0">
                <Img src={HOME_SCROLL_IMAGES.craft} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8">
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
              </div>
            </div>
          </motion.div>

          <motion.div className="absolute inset-0 z-[3]" style={{ y: showY, backgroundColor: SAND }}>
            <div className="grid h-full md:grid-cols-2">
              <div className="order-2 md:order-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8">
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
              </div>
              <div className="relative order-1 md:order-2 min-h-0">
                <Img src={HOME_SCROLL_IMAGES.product1} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </div>
          </motion.div>

          <motion.div className="absolute inset-0 z-[4]" style={{ y: philY, backgroundColor: INK }}>
            <div className="grid h-full md:grid-cols-2">
              <div className="relative min-h-0">
                <Img
                  src={HOME_SCROLL_IMAGES.product2}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-90"
                />
              </div>
              <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8 text-white">
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
              </div>
            </div>
          </motion.div>

          <SideLayer
            z={5}
            panel={sides[0]}
            frameX={side1X}
            textX={side1TextX}
            textOp={side1TextOp}
            fromRight
          />
          <SideLayer
            z={6}
            panel={sides[1]}
            frameX={side2X}
            textX={side2TextX}
            textOp={side2TextOp}
            fromRight={false}
          />
          <SideLayer
            z={7}
            panel={sides[2]}
            frameX={side3X}
            textX={side3TextX}
            textOp={side3TextOp}
            fromRight
          />

          <motion.div
            className="absolute inset-0 z-[8] overflow-hidden"
            style={{ opacity: finalOp, y: finalY }}
          >
            <Img src={HOME_SCROLL_IMAGES.final} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(45,36,30,0.4) 0%, rgba(45,36,30,0.75) 100%)" }}
              aria-hidden
            />
            <div className="relative z-10 flex h-full items-center justify-center px-6 text-center text-white">
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
            </div>
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
  fromRight,
}: {
  z: number;
  panel: SideCopy;
  frameX: MotionValue<string>;
  textX: MotionValue<string>;
  textOp: MotionValue<number>;
  fromRight: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: z, x: frameX, backgroundColor: CREAM }}
    >
      <div className={`grid h-full md:grid-cols-2 ${fromRight ? "" : "md:[&>*:first-child]:order-2"}`}>
        <div className="relative min-h-0">
          <Img src={panel.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <motion.div
          className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8"
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
