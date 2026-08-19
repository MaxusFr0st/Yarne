import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ScrollReveal } from "./ScrollReveal";
import { useLocale } from "../i18n/useLocale";
import { resolveMediaUrl } from "../utils/storefrontMedia";
import {
  getDefaultWhySectionContent,
  loadWhySectionContent,
  type WhySectionContent,
} from "../utils/whySectionContent";
import cherieSrc from "../../../assets/CherieOxBloddGen-removebg-preview.png";
import dvaSrc from "../../../assets/DvaShopperYelowGen-removebg-preview.png";

// This filename has a space + parens — a plain static import trips some
// bundlers on that, so it's resolved via URL instead. The other two import fine.
const femmoraSrc = new URL(
  "../../../assets/FemmoraPinkGen-removebg-preview (1).png",
  import.meta.url
).href;

const DEFAULT_IMAGES = [femmoraSrc, cherieSrc, dvaSrc] as const;
const BAG_COUNT = 3;

const TILT_RAD = (26 * Math.PI) / 180;
const SCALE_MAX = 1.62; // active bag scale
const SCALE_SPAN = 0.62;
const OPACITY_SPAN = 0.62;
const BLUR_MAX = 0.9; // px
const ROWH_FALLBACK = 200; // px, before first measurement

/** Soft in, long glide out — no bounce, no snap. */
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export type WhyBagHandle = {
  stepTo: (i: number) => void;
  jumpTo: (i: number) => void;
  getIndex: () => number;
  count: number;
};

type ArcResult = { x: number; y: number; scale: number; opacity: number; filter: string; zIndex: number };

/** Options ride a circle whose arc length between neighbours equals one row,
 *  so they swing in from the side rather than sliding flat. */
function computeArc(d: number, rowHRaw: number): ArcResult {
  const rowH = rowHRaw || ROWH_FALLBACK;
  const dist = Math.min(Math.abs(d), 1);
  const t = dist * dist * (3 - 2 * dist); // smoothstep
  const scale = SCALE_MAX - t * SCALE_SPAN;
  const blur = t * BLUR_MAX;
  const R = rowH / TILT_RAD;
  const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * TILT_RAD));
  const y = R * Math.sin(ang) - d * rowH;
  const xRaw = -R * (1 - Math.cos(ang));
  const x = Math.max(-rowH * 0.5, xRaw);
  return {
    x,
    y,
    scale,
    opacity: 1 - t * OPACITY_SPAN,
    filter: blur > 0.15 ? `blur(${blur}px)` : "none",
    zIndex: Math.round(100 - dist * 10),
  };
}

type BagArcImageProps = {
  progress: MotionValue<number>;
  rowH: MotionValue<number>;
  index: number;
  src: string;
  alt: string;
};

function BagArcImage({ progress, rowH, index, src, alt }: BagArcImageProps) {
  const arc = useTransform([progress, rowH], (latest: number[]) => {
    const [p, r] = latest;
    return computeArc(p - index, r);
  });
  const x = useTransform(arc, (a) => a.x);
  const y = useTransform(arc, (a) => a.y);
  const scale = useTransform(arc, (a) => a.scale);
  const opacity = useTransform(arc, (a) => a.opacity);
  const filter = useTransform(arc, (a) => a.filter);
  const zIndex = useTransform(arc, (a) => a.zIndex);

  return (
    <motion.img
      src={src}
      alt={alt}
      className="w-[58%] md:w-full h-full object-contain object-center block"
      style={{
        x,
        y,
        scale,
        opacity,
        filter,
        zIndex,
        willChange: "transform, opacity, filter",
        backfaceVisibility: "hidden",
      }}
    />
  );
}

export const WhyYarneSection = forwardRef<WhyBagHandle>(function WhyYarneSection(_props, ref) {
  const locale = useLocale();
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const rowH = useMotionValue(0);
  const indexRef = useRef(0);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const [factIndex, setFactIndex] = useState(0);
  const [content, setContent] = useState<WhySectionContent>(getDefaultWhySectionContent);

  useEffect(() => {
    let cancelled = false;
    void loadWhySectionContent().then((next) => {
      if (!cancelled) setContent(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useMotionValueEvent(progress, "change", (v) => {
    setFactIndex(Math.round(v));
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => rowH.set(el.clientHeight / 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowH]);

  const stepTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(BAG_COUNT - 1, i));
      indexRef.current = clamped;
      animRef.current?.stop();
      if (reducedMotion) {
        progress.set(clamped);
        return;
      }
      animRef.current = animate(progress, clamped, { duration: 1.2, ease: easeInOutCubic });
    },
    [progress, reducedMotion]
  );

  const jumpTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(BAG_COUNT - 1, i));
      animRef.current?.stop();
      indexRef.current = clamped;
      progress.set(clamped);
    },
    [progress]
  );

  useImperativeHandle(
    ref,
    () => ({
      stepTo,
      jumpTo,
      getIndex: () => indexRef.current,
      count: BAG_COUNT,
    }),
    [stepTo, jumpTo]
  );

  useEffect(
    () => () => {
      animRef.current?.stop();
    },
    []
  );

  const trackY = useTransform([progress, rowH], (latest: number[]) => {
    const [p, r] = latest;
    return -(p * r);
  });
  const railTop = useTransform(progress, (p) => `${(p / 2) * 100}%`);

  // Fact/caption crossfade — driven continuously off `progress`, independent of
  // the once-per-integer `factIndex` state that swaps the underlying text.
  const delta = useTransform(progress, (p) => p - Math.round(p));
  const factFade = useTransform(delta, (d) => Math.max(0, 1 - Math.min(1, Math.abs(d) * 2.5)));
  const factY = useTransform(delta, (d) => -d * 34);
  const captionX = useTransform(delta, (d) => d * 30);

  const localeCopy = content[locale];
  const images = content.images.map((url, i) => resolveMediaUrl(url) || DEFAULT_IMAGES[i]);
  const facts = localeCopy.items.map((item, i) => ({
    n: String(i + 1).padStart(2, "0"),
    title: item.factTitle,
    body: item.factBody,
  }));
  const captions = localeCopy.items.map((item) => item.caption);
  const fact = facts[factIndex] ?? facts[0];
  const caption = captions[factIndex] ?? captions[0];

  return (
    <section
      data-snap-why
      className="relative isolate overflow-hidden bg-[#2D241E] text-[#F5F2ED] pt-[66px] pb-0 md:pt-7 md:pb-7"
      style={{ height: "100dvh" }}
    >
      <div className="max-w-[1400px] mx-auto px-3.5 md:px-6 h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-12 h-full items-stretch">
          {/* Bag column — has its own entrance via the arc animation, not ScrollReveal */}
          <div className="relative flex flex-col items-center justify-start md:justify-center gap-0 md:gap-3.5 h-full min-h-0">
            <motion.div
              className="md:hidden relative z-[4] w-full px-[18px] pb-2.5 text-center shadow-[0_16px_20px_10px_#2D241E]"
              style={{ opacity: factFade, y: factY }}
            >
              <span
                className="mb-2 block text-[15px] italic text-[#F5F2ED]/40"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {fact.n}
              </span>
              <p className="m-0 text-[17px] font-medium leading-[1.3] text-[#F5F2ED]">{fact.title}</p>
              <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-[1.6] text-[#F5F2ED]/62">
                {fact.body}
              </p>
            </motion.div>

            <div
              ref={stageRef}
              className="relative w-full max-w-[min(54vh,320px)] md:max-w-[min(80vh,720px)] flex-1 min-h-0"
            >
              <div className="absolute inset-0 overflow-hidden">
                <motion.div className="flex flex-col" style={{ height: "200%", y: trackY }}>
                  <div style={{ height: "12.5%" }} className="shrink-0" />
                  {images.map((src, i) => (
                    <div
                      key={i}
                      style={{ height: "25%" }}
                      className="flex shrink-0 items-center justify-center overflow-visible"
                    >
                      <BagArcImage progress={progress} rowH={rowH} index={i} src={src} alt={captions[i] ?? ""} />
                    </div>
                  ))}
                  <div style={{ height: "12.5%" }} className="shrink-0" />
                </motion.div>
              </div>

              <div className="pointer-events-none hidden md:block absolute md:left-auto md:right-[-26px] md:top-[12%] md:bottom-[12%] w-[2px] bg-white/15">
                <motion.div
                  className="absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5F2ED]"
                  style={{ top: railTop }}
                />
              </div>
            </div>

            <motion.p
              className="absolute md:static top-[188px] md:top-auto right-[18px] md:right-auto z-[5] m-0 max-w-[52%] md:max-w-none text-right md:text-center text-[17px] md:text-[13px] italic leading-[1.45] md:leading-normal text-[#F5F2ED]/90 md:text-[#F5F2ED]/50 [text-shadow:0_2px_14px_rgba(45,36,30,0.9)] md:[text-shadow:none]"
              style={{ fontFamily: "'Cormorant Garamond', serif", opacity: factFade, x: captionX }}
            >
              {caption}
            </motion.p>
          </div>

          {/* Desktop copy column */}
          <div className="hidden md:flex flex-col justify-center gap-[clamp(12px,2.6vh,32px)] min-h-0 pl-[60px]">
            <ScrollReveal>
              <p
                className="mb-3.5 text-[11px] uppercase tracking-[0.24em] text-[#F5F2ED]/40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {localeCopy.eyebrow}
              </p>
              <h2
                className="text-[#F5F2ED] font-normal leading-[1.12]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3.4vw, 2.6rem)" }}
              >
                {localeCopy.titleLine1}
                <br />
                <em className="font-light italic opacity-[0.85]">{localeCopy.titleAccent}</em>
              </h2>
            </ScrollReveal>

            <div className="flex flex-col">
              {facts.map((f, i) => (
                <ScrollReveal
                  key={f.n}
                  delay={i * 0.12}
                  className={`flex items-baseline gap-6 border-t border-white/[0.14] py-[clamp(6px,1.5vh,18px)] ${
                    i === facts.length - 1 ? "border-b border-white/[0.14]" : ""
                  }`}
                >
                  <div>
                    <p className="m-0 text-[15px] font-medium text-[#F5F2ED]">{f.title}</p>
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-[#F5F2ED]/50">{f.body}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
