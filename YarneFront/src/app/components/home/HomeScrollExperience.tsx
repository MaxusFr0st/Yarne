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

/** Calm scroll runway — longer = slower chapter pacing. */
const STORY_VH = 420;
const STORY_VH_TOUCH = 360;

const EASE_OUT = cubicBezier(0.16, 1, 0.3, 1);

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
 * Sticky full-viewport stage: hero holds → why rises to 50% → expands to 100% → final stacks →
 * stage releases flush with the track end so the footer follows with no cream gap.
 */
export function HomeScrollExperience({ heroImageUrl }: { heroImageUrl: string }) {
  const copy = useHomePageCopy();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const touch = useTouchMobileLayout();
  const simplify = Boolean(reducedMotion);
  const heroSrc = resolveMediaUrl(heroImageUrl) || heroImageUrl || HOME_SCROLL_IMAGES.craft;

  const whyPoints = t("home.scrollStory.whyPoints", { returnObjects: true }) as string[];

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
  skipLabel,
  touch,
}: {
  heroSrc: string;
  copy: ReturnType<typeof useHomePageCopy>;
  whyPoints: string[];
  whyEyebrow: string;
  whyTitle: string;
  skipLabel: string;
  touch: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: touch ? 90 : 70,
    damping: touch ? 28 : 32,
    mass: 0.85,
    restDelta: 0.0008,
  });

  // Hero hold → rise to 50% → hold → expand to 100% → hold
  const whyHeight = useTransform(
    progress,
    [0, 0.14, 0.28, 0.36, 0.5, 1],
    ["0%", "0%", "50%", "50%", "100%", "100%"],
    { ease: [EASE_OUT, EASE_OUT, EASE_OUT, EASE_OUT, EASE_OUT] },
  );

  const whyCopySeg = useSegment(progress, 0.18, 0.32);
  const whyCopyOp = useTransform(whyCopySeg, [0, 1], [0, 1]);
  const whyCopyY = useTransform(whyCopySeg, [0, 1], [28, 0]);

  // Final full panel stacks after why is settled
  const finalSeg = useSegment(progress, 0.58, 0.78);
  const finalY = useTransform(finalSeg, [0, 1], ["100%", "0%"]);
  const finalCopySeg = useSegment(progress, 0.66, 0.86);
  const finalCopyOp = useTransform(finalCopySeg, [0, 1], [0, 1]);
  const finalCopyY = useTransform(finalCopySeg, [0, 1], [24, 0]);

  const heroCopyFade = useTransform(progress, [0.12, 0.3], [1, 0], { clamp: true });

  const vh = touch ? STORY_VH_TOUCH : STORY_VH;
  const storyHeight = `calc(var(--app-vh, 1vh) * ${vh})`;

  return (
    <div className="relative bg-[#F5F2ED]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <a
        href="#home-story-end"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-[#2D241E]"
      >
        {skipLabel}
      </a>

      <div ref={trackRef} className="relative" style={{ height: storyHeight }}>
        {/* Sticky pin releases flush with track end → footer follows without a cream gap */}
        <div
          className="sticky top-0 overflow-hidden"
          style={{
            height: "calc(var(--app-vh, 1vh) * 100)",
            backgroundColor: CREAM,
            zIndex: 1,
          }}
          aria-label="Yarné home story"
        >
          {/* Hero — fully visible until the why panel covers it */}
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

          {/* Why — rises from bottom to 50%, then expands to full screen */}
          <motion.div
            className="absolute inset-x-0 bottom-0 z-[2] overflow-hidden"
            style={{ height: whyHeight, backgroundColor: CREAM }}
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

          {/* Final lookbook — stacks over the full why panel */}
          <motion.div
            className="absolute inset-0 z-[3] overflow-hidden will-change-transform"
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
