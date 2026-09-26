import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { LangLink } from "../i18n/LangLink";
import { ImageWithFallback as Img } from "./figma/ImageWithFallback";
import { useLocale } from "../i18n/useLocale";
import { resolveMediaUrl } from "../utils/storefrontMedia";
import { WHY_DEFAULT_IMAGES } from "../utils/whyDefaultImages";
import { getStableViewportHeight, onStableViewportChange } from "../utils/stableViewport";
import { peekStorefrontSetting } from "../api/storefrontSettings";
import { firstVisitRevealStyle, useFirstVisitReady } from "../hooks/useFirstVisitReady";
import { useSeenLock } from "../hooks/useSeenLock";
import {
  getInitialWhySectionContent,
  loadWhySectionContent,
  WHY_SECTION_KEY,
  type WhySectionContent,
} from "../utils/whySectionContent";

/**
 * Scroll-pinned "why Yarné" section.
 *
 * The section is much taller than the screen and its inner frame is `position: sticky`, so
 * scrolling through it plays one step per product (the three bags, then Yarné Care). Every
 * bag rides one shared circle, STEP radians apart, at angle (i - progress) * STEP; the
 * display words and the copy crossfade off the same `progress`.
 */

// ---- orbit ----
const STEP = (30 * Math.PI) / 180;
const SPREAD = 0.52;
const BOX = 0.9; // bag box height as a share of its stage (desktop)
const STAGE_FALLBACK = 420;
const ORBIT_HOLD = 0.3; // phones: how far from its own position a bag stays fully present

// ---- scroll ----
const STEPS = 4; // three bags + Yarné Care
const SCROLL_PER_SLIDE_SVH = 90; // desktop
const PHONE_SCROLL_PER_SLIDE_SVH = 50;
/** Share of one screen spent holding at each end of the phone section. */
const LEAD = 0.4;
const GLIDE = 0.16; // per-frame easing toward the scroll target
const TEXT_HOLD = 0.35; // share of a step where its copy is fully opaque

const MAX_SQUEEZE = 4;

const SERIF = "'Prata', serif";
const SANS = "'Archivo', sans-serif";
const INK = "#1E1B18";
const BROWN = "#6B5445";
const WORD_TINT = "#7A6A58";

const sceneMaskPhone =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 78%, rgba(0,0,0,0) 100%)";
const sceneMaskDesktop =
  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 18%, rgba(0,0,0,1) 38%), " +
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%)";

const prettyWrap = { textWrap: "pretty" } as CSSProperties;

/** `pct` percent of the layout height. Not svh/vh: in-app browsers resize those as their bars slide. */
const sv = (pct: number) => `calc(var(--app-svh) * ${pct / 100})`;

function makeHold(holdW: number) {
  const H = Math.min(Math.max(holdW, 0.05), 0.48);
  const F = (0.5 - H) * 2;
  return (d: number) => {
    const a = Math.abs(d);
    if (a <= H) return 1;
    if (a >= H + F) return 0;
    const t = (a - H) / F;
    return 1 - t * t * (3 - 2 * t);
  };
}

const hold = makeHold(TEXT_HOLD);

function orbit(d: number, stageH: number, tight: boolean) {
  const H = stageH || STAGE_FALLBACK;
  // Phones trade orbit travel for size: the bag barely moves, it crossfades.
  const R = (H * (tight ? SPREAD * 0.21 : SPREAD)) / Math.sin(STEP);
  const ang = d * STEP;
  const dist = Math.abs(d);
  // On phones each bag holds fully present around its own position, then ramps linearly to
  // zero — the linear ramp keeps the outgoing and incoming pair summing to 1, so a handover
  // reads as one image dissolving rather than two half-transparent ones.
  const away = Math.max(0, dist - ORBIT_HOLD);
  const blur = Math.min(away, 1.6) * 1.1;
  // Desktop: a bag already scrolled past (d < 0) fades out fully by 0.6 of a step, so it's
  // gone before the next bag settles.
  const gone = Math.min(1, dist / 0.6);
  const opacity = tight
    ? Math.max(0, 1 - away / (1 - 2 * ORBIT_HOLD))
    : d < 0
      ? 1 - gone * gone * (3 - 2 * gone)
      : Math.max(0, 1 - Math.min(dist, 1.6) * 0.55);
  return {
    x: -R * (1 - Math.cos(ang)),
    y: R * Math.sin(ang),
    scale: 1 - Math.min(tight ? away : dist, 2) * 0.17,
    opacity,
    filter: blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : "none",
    // Desktop: the outgoing bag always sits under the incoming one.
    zIndex: Math.round(100 - dist * 10) - (!tight && d < 0 ? 50 : 0),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

type View = {
  isNarrow: boolean;
  vw: number;
  vh: number;
  /** Fit-to-screen steps taken so far; each shrinks type/spacing until the frame stops overflowing. */
  squeeze: number;
  stageH: number;
  roomW: number;
  roomH: number;
  factRoom: number;
  slotTop: number;
  slotBottom: number;
  seen: boolean;
};

function readInitialView(): View {
  const hasWindow = typeof window !== "undefined";
  return {
    isNarrow: hasWindow ? window.matchMedia("(max-width: 767px)").matches : false,
    vw: hasWindow ? window.innerWidth : 1200,
    vh: hasWindow ? getStableViewportHeight() : 800,
    squeeze: 0,
    stageH: 0,
    roomW: 0,
    roomH: 0,
    factRoom: 0,
    slotTop: 0,
    slotBottom: 0,
    seen: false,
  };
}

export function WhyYarneSection() {
  const locale = useLocale();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion() ?? false;
  const [loaded, setLoaded] = useState<WhySectionContent>(getInitialWhySectionContent);
  const [view, setView] = useState<View>(readInitialView);
  const [progress, setProgress] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const wordRowRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const factColRef = useRef<HTMLDivElement>(null);

  // Read by the frame loop, which outlives any single render.
  const viewRef = useRef(view);
  viewRef.current = view;
  const progressRef = useRef(0);

  // Stable identity (it only calls setView), so effects can list it as a dependency.
  const patchView = useCallback((patch: Partial<View>) => {
    setView((prev) => {
      for (const key of Object.keys(patch) as (keyof View)[]) {
        if (prev[key] !== patch[key]) return { ...prev, ...patch };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadWhySectionContent().then((next) => {
      if (!cancelled) setLoaded(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hidden on a first visit until the admin's content is in, then kept once seen (useSeenLock).
  const ready = useFirstVisitReady(() => peekStorefrontSetting(WHY_SECTION_KEY) !== undefined, loadWhySectionContent);
  const content = useSeenLock(loaded, ready, sectionRef);

  // ---- viewport ----
  useEffect(() => {
    // The height is frozen on touch devices (see stableViewport.ts), so a bar sliding reads as
    // no change here; only a real window resize or rotation does.
    const read = () => {
      const narrow = window.matchMedia("(max-width: 767px)").matches;
      const w = window.innerWidth;
      const h = getStableViewportHeight();
      setView((prev) => {
        if (narrow === prev.isNarrow && Math.abs(h - prev.vh) <= 4 && Math.abs(w - prev.vw) <= 4) return prev;
        return { ...prev, isNarrow: narrow, vw: w, vh: h, squeeze: 0 };
      });
    };
    read();
    window.addEventListener("resize", read);
    const offStable = onStableViewportChange(read);
    return () => {
      offStable();
      window.removeEventListener("resize", read);
    };
  }, []);

  // ---- layout measurement ----
  // Runs after every layout-affecting change and only ever sets state when a number actually
  // moved, so it settles in a render or two. The copy, the word row and the phone image band
  // all size themselves off what the previous pass measured.
  const [remeasure, setRemeasure] = useState(0);
  useLayoutEffect(() => {
    const next: Partial<View> = {};
    const num = <K extends keyof View>(key: K, value: number, tolerance: number) => {
      if (Math.abs(value - (view[key] as number)) > tolerance) (next as Record<string, number>)[key] = value;
    };

    const frame = frameRef.current;
    // Desktop keeps a hair-trigger; phones ignore the few px of slack the incoming card's
    // translateY creates.
    const slack = view.isNarrow ? 24 : 2;
    if (frame && frame.scrollHeight - frame.clientHeight > slack && view.squeeze < MAX_SQUEEZE) {
      next.squeeze = view.squeeze + 1;
    }

    if (stageRef.current) num("stageH", stageRef.current.clientHeight, 0.5);

    const row = wordRowRef.current;
    if (row) {
      num("roomW", row.clientWidth, 1);
      num("roomH", row.clientHeight, 1);
    }

    // On phones the bags live in their own band of the grid, measured here, so nothing can
    // ever sit on top of the copy.
    const pin = pinRef.current;
    const slot = slotRef.current;
    if (view.isNarrow && pin && slot) {
      const pr = pin.getBoundingClientRect();
      const sr = slot.getBoundingClientRect();
      num("slotTop", Math.round(sr.top - pr.top), 2);
      num("slotBottom", Math.round(pr.bottom - sr.bottom), 2);
    }

    const col = factColRef.current;
    if (col) {
      let tallest = 0;
      for (const child of Array.from(col.children) as HTMLElement[]) {
        tallest = Math.max(tallest, child.offsetHeight);
      }
      num("factRoom", tallest, 1);
    }

    if (Object.keys(next).length) patchView(next);
    // `content` and `locale` are here because the copy changes text metrics.
  }, [view, content, locale, remeasure, patchView]);

  // Web fonts and late-arriving copy change text metrics after the first paint.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setRemeasure((n) => n + 1));
    ro.observe(frame);
    void document.fonts?.ready.then(() => setRemeasure((n) => n + 1));
    return () => ro.disconnect();
  }, []);

  // ---- scroll → progress ----
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;
    let visible = false;
    let firstFrame = true;

    // Free scroll stays free. But once the wheel lets go anywhere near a product's own
    // position, the page glides the last bit onto it and rests there — so you never come to a
    // halt half-way between two products. Pointer devices only: on touch it fought the finger.
    const magnet = {
      run: false,
      start: 0,
      dur: 0,
      from: 0,
      delta: 0,
      expect: 0,
      lastInput: 0,
      touching: false,
      lastY: null as number | null,
      movedAt: 0,
      still: 0,
      settledAt: null as number | null,
    };

    const runMagnet = (within: number, active: number) => {
      const now = performance.now();
      const y = window.scrollY;
      const inside = within > 1 && within < active - 1;
      // Leaving the section clears the memory of what we last settled on, so coming back in
      // behaves like a first visit.
      if (!inside) magnet.settledAt = null;

      const zoomed = window.visualViewport ? window.visualViewport.scale > 1.05 : false;
      if (reducedMotion || zoomed || viewRef.current.isNarrow) {
        magnet.run = false;
        return;
      }

      if (magnet.run) {
        // Anything we didn't cause — a wheel tick, a fling still decaying, an anchor jump —
        // aborts the glide rather than fighting it. Browsers round scrollTop, so the
        // tolerance has to survive that.
        const hijacked = Math.abs(y - magnet.expect) > 6;
        if (hijacked || magnet.touching || now - magnet.lastInput < 60 || !inside) {
          magnet.run = false;
        } else {
          const k = Math.min(1, (now - magnet.start) / magnet.dur);
          // Smootherstep: leaves rest and arrives with zero velocity at both ends.
          const e = k * k * k * (k * (6 * k - 15) + 10);
          window.scrollTo(0, magnet.from + magnet.delta * e);
          magnet.expect = window.scrollY;
          if (k >= 1) magnet.run = false;
          return;
        }
      }

      // Two still frames, not one: momentum can dip under the threshold mid-fling, and
      // grabbing the scroll there is what makes snapping fight the user.
      const moving = Math.abs(y - (magnet.lastY ?? y)) > 0.6;
      magnet.lastY = y;
      if (moving) {
        magnet.movedAt = now;
        magnet.still = 0;
      } else {
        magnet.still += 1;
      }
      const idle = magnet.still >= 2 && now - magnet.movedAt > 130 && now - magnet.lastInput > 130;
      if (!inside || magnet.touching || moving || !idle) return;

      const seg = active / (STEPS - 1);
      const raw = within / seg;
      const n = Math.round(raw);
      // Once a product has been settled on, small nudges are left alone; the glide only
      // returns after you've genuinely moved into another product's half of the scroll.
      if (magnet.settledAt != null && Math.abs(raw - magnet.settledAt) < 0.55) return;
      const off = raw - n;
      if (Math.abs(off) < 0.01) return;

      magnet.settledAt = n;
      magnet.run = true;
      magnet.start = now;
      // Short hops finish quickly; the longest allowed pull gets the full glide.
      magnet.dur = 380 + Math.min(1, Math.abs(off) / 0.5) * 340;
      magnet.from = y;
      magnet.delta = -off * seg;
      magnet.expect = y;
    };

    const step = () => {
      const v = viewRef.current;
      const pin = pinRef.current;
      // The distance the pinned frame stays stuck for. Measured against the frame (not
      // innerHeight) so mobile toolbars collapsing don't shift where each product lands.
      const travel = Math.max(1, section.offsetHeight - (pin ? pin.offsetHeight : getStableViewportHeight()));
      const rect = section.getBoundingClientRect();
      const scrolled = clamp(-rect.top, 0, travel);

      // Phones get a longer section without faster product changes: quiet lead-in and
      // lead-out scroll where the first/last product simply holds.
      const lead = v.isNarrow ? Math.max(0, Math.min(v.vh * LEAD, (travel - 100) / 2)) : 0;
      const active = Math.max(1, travel - lead * 2);
      const within = clamp(scrolled - lead, 0, active);
      const target = (within / active) * (STEPS - 1);

      const from = progressRef.current;
      // Touch scrolling is short and impatient: follow the finger much closer.
      const ease = reducedMotion || firstFrame ? 1 : v.isNarrow ? Math.min(0.42, Math.max(GLIDE * 2.2, 0.3)) : GLIDE;
      firstFrame = false;
      const eased = from + (target - from) * ease;
      const settled = Math.abs(target - eased) < 0.0008 ? target : eased;
      if (Math.abs(settled - from) > 0.0004) {
        progressRef.current = settled;
        setProgress(settled);
      }

      if (!v.seen && rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
        patchView({ seen: true });
      }

      runMagnet(within, active);
    };

    const frame = () => {
      raf = 0;
      step();
      if (visible) raf = requestAnimationFrame(frame);
    };

    // The loop only runs while the (very tall) section is on screen.
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(section);

    const onInput = (e: Event) => {
      magnet.lastInput = performance.now();
      magnet.run = false;
      if (e.type === "touchstart" || e.type === "touchmove") magnet.touching = true;
    };
    const onRelease = () => {
      magnet.touching = false;
      magnet.lastInput = performance.now();
    };
    const inputEvents = ["wheel", "touchstart", "touchmove", "pointerdown", "keydown"] as const;
    const releaseEvents = ["touchend", "touchcancel"] as const;
    for (const ev of inputEvents) window.addEventListener(ev, onInput, { passive: true, capture: true });
    for (const ev of releaseEvents) window.addEventListener(ev, onRelease, { passive: true, capture: true });

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      for (const ev of inputEvents) window.removeEventListener(ev, onInput, { capture: true });
      for (const ev of releaseEvents) window.removeEventListener(ev, onRelease, { capture: true });
    };
  }, [reducedMotion, patchView]);

  // ---- derived values ----
  const copy = content[locale];
  const { isNarrow, vh } = view;
  const p = progress;
  const level = Math.max(view.squeeze, vh < 560 ? 3 : vh < 620 ? 2 : vh < 720 ? 1 : 0);
  const tiny = isNarrow && vh < 680;
  const on = reducedMotion || view.seen;
  const lastBag = copy.items.length - 1;

  const stretch = !isNarrow && level >= 2 ? 1.2 : isNarrow ? 1.22 : 1.34;
  const labels = [...copy.items.map((it) => it.word), copy.care.word];
  const widest = labels.reduce((m, l) => Math.max(m, l.length), 0);
  const ceiling = isNarrow
    ? Math.max(38, Math.min(92, Math.round(vh * 0.115)))
    : level >= 3
      ? 110
      : level >= 2
        ? 165
        : 250;
  const byWidth = view.roomW ? view.roomW / (widest * 0.585) : ceiling;
  // On phones the word row is auto-sized, so height can't drive the size (it would feed back
  // on itself) — width and the viewport cap do.
  const byHeight = isNarrow ? ceiling : view.roomH ? (view.roomH * 0.96) / stretch : ceiling;
  const wordPx = Math.max(isNarrow ? 30 : 44, Math.min(ceiling, byWidth, byHeight));
  const wordLift = isNarrow ? (wordPx * (stretch - 1)) / 2 : 0;

  // One painted scene per bag; the Care step keeps the last one. A slot without its own upload
  // borrows its nearest neighbour's so the ground stays covered.
  const bgUrls = content.backgrounds.map((b) => resolveMediaUrl(b));
  const bgOn = bgUrls.some(Boolean);
  const scenes = bgUrls.map((own, i) => {
    const src = own || bgUrls.slice(0, i).reverse().find(Boolean) || bgUrls.find(Boolean) || "";
    // Stacked dissolve: each scene fades in over the one below it, so the ground is always
    // fully covered — never a see-through double exposure.
    const inT = i === 0 ? 1 : clamp((p - i + 0.7) / 0.4, 0, 1);
    const push = clamp(i + 1 - p, 0, 2) / 2;
    return { src, opacity: inT, scale: 1 + 0.07 * push };
  });
  const shade = bgOn ? "drop-shadow(0 14px 16px rgba(40,28,18,0.3))" : "";

  const bags = copy.items.map((item, i) => {
    // The last bag stays put while the Care step takes over.
    const d = i === lastBag ? Math.max(i - p, 0) : i - p;
    const o = orbit(d, view.stageH, isNarrow);
    const code = content.productCodes[i].trim();
    return {
      src: resolveMediaUrl(content.images[i]) || WHY_DEFAULT_IMAGES[i],
      alt: item.caption,
      href: code ? `/product/${code}` : "",
      ...o,
      filter: o.filter === "none" ? shade || "none" : `${o.filter} ${shade}`,
    };
  });

  const words = labels.map((label, i) => {
    const n = hold(i - p);
    return { label, color: i === lastBag + 1 ? BROWN : WORD_TINT, opacity: n, shift: wordLift + (1 - n) * 18 };
  });

  const facts = [
    ...copy.items.map((item, i) => ({ title: item.factTitle, body: item.factBody, care: false, href: bags[i].href })),
    { title: copy.care.title, body: "", care: true, href: "" },
  ].map((f, i) => {
    const n = hold(i - p);
    const o = on ? n : 0;
    return {
      ...f,
      opacity: o,
      shift: on ? (1 - n) * 16 : 18,
      interactive: o > 0.9,
      bodyHidden: f.care || (!isNarrow && level >= 3) || (tiny && level >= 3),
    };
  });

  const transition = reducedMotion ? undefined : "opacity 180ms linear, transform 180ms linear";
  const bagBoxHeight = isNarrow ? "100%" : `${BOX * 100}%`;
  const phoneMask =
    "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 4%, rgba(0,0,0,1) 96%, rgba(0,0,0,0) 100%)";
  const scrollSpan = isNarrow
    ? sv((STEPS - 1) * PHONE_SCROLL_PER_SLIDE_SVH + LEAD * 200)
    : sv((STEPS - 1) * SCROLL_PER_SLIDE_SVH);

  const factTitleSize = isNarrow
    ? tiny
      ? "clamp(20px,5.6vw,26px)"
      : "clamp(22px,6.4vw,32px)"
    : level >= 3
      ? "clamp(26px,2.6vw,34px)"
      : level >= 2
        ? "clamp(30px,3vw,41px)"
        : level >= 1
          ? "clamp(35px,3.5vw,50px)"
          : "clamp(40px,4.2vw,66px)";
  const factBodySize = isNarrow ? (tiny ? "13px" : "14px") : level >= 1 ? "14px" : "clamp(14px,1.05vw,16px)";
  const factStackHeight = view.factRoom
    ? `${view.factRoom}px`
    : isNarrow
      ? "170px"
      : level >= 3
        ? "108px"
        : level >= 2
          ? "132px"
          : `clamp(160px,${sv(20)},230px)`;
  const topPad = isNarrow ? "10px" : level >= 3 ? "6px" : level >= 2 ? "10px" : `clamp(14px,${sv(2.6)},32px)`;
  const bottomPad = isNarrow
    ? `clamp(16px,${sv(3.4)},30px)`
    : level >= 3
      ? "12px"
      : level >= 2
        ? "16px"
        : `clamp(20px,${sv(5)},64px)`;
  const careBodyHidden = isNarrow ? tiny : level >= 2;

  return (
    <section
      ref={sectionRef}
      aria-busy={!ready}
      style={{
        ...firstVisitRevealStyle(ready, reducedMotion),
        position: "relative",
        background: "#F1ECE4",
        color: INK,
        // The pinned frame is svh + the browser-bar strip (see --browser-bar-b), like every
        // other full-screen section on this page, so the frame doesn't resize while a mobile
        // toolbar collapses. The scroll span is added on top of that.
        height: `calc(var(--app-svh) + var(--browser-bar-b) + ${scrollSpan})`,
      }}
    >
      <div
        ref={pinRef}
        style={{
          position: "sticky",
          top: 0,
          height: "calc(var(--app-svh) + var(--browser-bar-b))",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {bgOn && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              // Desktop: the painting fills the right side behind the orbiting bag and feathers
              // left into the cream under the copy, and top/bottom into the neighbouring sections.
              left: isNarrow ? 0 : "clamp(320px,42vw,860px)",
              right: 0,
              top: isNarrow ? Math.max(0, view.slotTop - 14) : 0,
              bottom: isNarrow ? Math.max(0, view.slotBottom - 14) : 0,
              overflow: "hidden",
              WebkitMaskImage: isNarrow ? sceneMaskPhone : sceneMaskDesktop,
              maskImage: isNarrow ? sceneMaskPhone : sceneMaskDesktop,
              WebkitMaskComposite: isNarrow ? "source-over" : "source-in",
              maskComposite: isNarrow ? "add" : "intersect",
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            {scenes.map((sc, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: "-4%",
                  backgroundImage: `url("${sc.src}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: sc.opacity,
                  transform: `scale(${sc.scale.toFixed(4)})`,
                  filter: "saturate(0.88)",
                  willChange: "opacity, transform",
                }}
              />
            ))}
            <div style={{ position: "absolute", inset: 0, background: "rgba(241,236,228,0.14)" }} />
          </div>
        )}

        <div
          ref={stageRef}
          style={{
            position: "absolute",
            left: isNarrow ? 0 : "auto",
            right: isNarrow ? 0 : "clamp(-40px,-2vw,0px)",
            top: isNarrow ? view.slotTop : "20%",
            bottom: isNarrow ? view.slotBottom : 0,
            width: isNarrow ? "auto" : "clamp(380px,46vw,760px)",
            overflow: isNarrow ? "hidden" : "visible",
            WebkitMaskImage: isNarrow ? phoneMask : "none",
            maskImage: isNarrow ? phoneMask : "none",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {bags.map((bag, i) => {
            // The wrapper carries the orbit (position, scale, scroll opacity); the photo inside
            // only fades in once it has loaded, so the two never fight over opacity.
            const box: CSSProperties = {
              position: "absolute",
              left: "50%",
              top: "50%",
              display: "block",
              width: "100%",
              height: bagBoxHeight,
              transform: `translate(-50%,-50%) translate(${bag.x.toFixed(1)}px,${bag.y.toFixed(1)}px) scale(${bag.scale.toFixed(3)})`,
              opacity: bag.opacity,
              filter: bag.filter,
              zIndex: bag.zIndex,
              willChange: "transform",
              userSelect: "none",
            };
            const img = (
              <Img
                src={bag.src}
                alt={bag.alt}
                draggable={false}
                loading="eager"
                fadeIn
                style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }}
              />
            );
            if (!bag.href) return <div key={i} style={box}>{img}</div>;
            // Linked bags open their product, like the bento tiles. Only the bag on screen
            // takes clicks; the stage itself stays click-through.
            const active = bag.opacity > 0.9;
            return (
              <LangLink
                key={i}
                to={bag.href}
                tabIndex={active ? 0 : -1}
                aria-hidden={!active}
                style={{ ...box, pointerEvents: active ? "auto" : "none", cursor: "pointer" }}
              >
                {img}
              </LangLink>
            );
          })}
        </div>

        <div
          ref={frameRef}
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateRows: isNarrow ? "auto auto minmax(0,1fr) auto" : "auto minmax(0,1fr) auto",
            height: "100%",
            maxWidth: 1500,
            margin: "0 auto",
            boxSizing: "border-box",
            paddingTop: `calc(var(--main-header-h, 57px) + env(safe-area-inset-top, 0px) + ${topPad})`,
            paddingBottom: `calc(var(--browser-bar-b) + ${bottomPad})`,
            paddingLeft: "clamp(16px,4vw,56px)",
            paddingRight: "clamp(16px,4vw,56px)",
            gap: isNarrow ? `clamp(6px,${sv(1)},12px)` : `clamp(10px,${sv(2)},24px)`,
          }}
        >
          <h2
            style={{
              margin: 0,
              paddingBottom: isNarrow ? 8 : 0,
              borderBottom: isNarrow ? "1px solid rgba(30,27,24,0.14)" : "none",
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: isNarrow ? 9 : 10,
              textTransform: "uppercase",
              letterSpacing: "0.34em",
              color: "rgba(30,27,24,0.58)",
            }}
          >
            {copy.heading}
          </h2>

          <div
            ref={wordRowRef}
            aria-hidden="true"
            style={{ position: "relative", display: "flex", alignItems: "center", minHeight: 0, overflow: "hidden" }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: isNarrow ? wordPx * stretch : wordPx,
              }}
            >
              {words.map((word, i) => (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transformOrigin: "left center",
                    fontFamily: SERIF,
                    fontSize: wordPx,
                    lineHeight: 1,
                    letterSpacing: "-0.015em",
                    whiteSpace: "nowrap",
                    color: word.color,
                    opacity: word.opacity,
                    transform: `translateY(${word.shift.toFixed(1)}px) scaleY(${stretch})`,
                    transition,
                  }}
                >
                  {word.label}
                </span>
              ))}
            </div>
          </div>

          <div
            ref={slotRef}
            aria-hidden="true"
            style={{
              display: isNarrow ? "block" : "none",
              minHeight: isNarrow ? `clamp(180px,${sv(32)},340px)` : 0,
            }}
          />

          <div
            ref={factColRef}
            style={{
              position: "relative",
              minHeight: factStackHeight,
              width: isNarrow ? "100%" : "min(56%,680px)",
            }}
          >
            {facts.map((fact, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: isNarrow ? 0 : "clamp(44px,5vw,88px)",
                  opacity: fact.opacity,
                  transform: `translateY(${fact.shift.toFixed(1)}px)`,
                  transition,
                  pointerEvents: fact.interactive ? "auto" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: isNarrow ? `clamp(8px,${sv(1.4)},14px)` : `clamp(10px,${sv(1.6)},18px)`,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      maxWidth: "24ch",
                      fontFamily: SERIF,
                      fontSize: factTitleSize,
                      lineHeight: 1.02,
                      letterSpacing: "-0.012em",
                      color: fact.care ? BROWN : INK,
                      ...prettyWrap,
                    }}
                  >
                    {fact.title}
                  </p>

                  {!fact.care && (
                    <p
                      style={{
                        display: fact.bodyHidden ? "none" : "block",
                        margin: 0,
                        maxWidth: "38ch",
                        fontFamily: SANS,
                        fontSize: factBodySize,
                        lineHeight: 1.6,
                        color: "rgba(30,27,24,0.72)",
                        ...prettyWrap,
                      }}
                    >
                      {fact.body}
                    </p>
                  )}

                  {fact.href && (
                    <LangLink
                      to={fact.href}
                      tabIndex={fact.interactive ? 0 : -1}
                      className="text-[#6B5445] hover:text-[#1E1B18] transition-colors duration-200"
                      style={{
                        alignSelf: "flex-start",
                        fontFamily: SANS,
                        fontSize: isNarrow ? 11 : 12,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        textDecoration: "underline",
                        textUnderlineOffset: 5,
                      }}
                    >
                      {t("home.why.viewProduct")}
                    </LangLink>
                  )}

                  {fact.care && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: isNarrow ? "column" : "row",
                        flexWrap: "wrap",
                        gap: isNarrow ? 8 : "clamp(14px,2.2vw,40px)",
                      }}
                    >
                      {copy.care.items.map((item, j) => (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            maxWidth: isNarrow ? "100%" : "21ch",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontFamily: SANS,
                              fontWeight: 500,
                              fontSize: isNarrow ? 11 : "clamp(13px,1vw,15px)",
                              textTransform: "uppercase",
                              letterSpacing: "0.14em",
                              color: BROWN,
                            }}
                          >
                            {item.title}
                          </p>
                          <p
                            style={{
                              display: careBodyHidden ? "none" : "block",
                              margin: 0,
                              fontFamily: SANS,
                              fontSize: isNarrow ? 12 : level >= 1 ? 12 : "clamp(12px,0.9vw,13px)",
                              lineHeight: 1.5,
                              color: "rgba(30,27,24,0.68)",
                            }}
                          >
                            {item.body}
                          </p>
                        </div>
                      ))}
                      <LangLink
                        to="/pages/care"
                        tabIndex={fact.interactive ? 0 : -1}
                        className="text-[#6B5445] hover:text-[#1E1B18] transition-colors duration-200"
                        style={{
                          display: isNarrow || level >= 1 ? "none" : "block",
                          alignSelf: "flex-end",
                          fontFamily: SANS,
                          fontSize: 11,
                          letterSpacing: "0.04em",
                          textDecoration: "underline",
                          textUnderlineOffset: 5,
                        }}
                      >
                        {copy.care.linkLabel}
                      </LangLink>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
