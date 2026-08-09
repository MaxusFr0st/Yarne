import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { animate } from "motion/react";
import type { WhyBagHandle } from "../components/WhyYarneSection";

// ---- snap-stop geometry (× viewport height, except *_PX which are px) ----
const SLIVER_RATIO = 0.3;
const TALL_RATIO = 1.25;
const DEDUPE_RATIO = 0.4;
const WHY_PARK_TOL_PX = 120;
const DIR_TOL_PX = 24;

// ---- timing ----
const WHY_BUSY_MS = 1240;
const PAGE_MIN_MS = 850;
const PAGE_MAX_MS = 1300;
const PAGE_PER_VH_MS = 280;
const PAGE_BUSY_PAD_MS = 40;
const GESTURE_QUIET_MS = 150;
const MIN_DELTA_Y = 2;

// ---- touch (mobile/tablet swipe) ----
// A swipe is direction-only: it doesn't matter how far or how fast you drag
// past the deadzone, one swipe always steps exactly one section (or one bag).
const TOUCH_DEADZONE_PX = 10; // below this, still deciding vertical vs horizontal
const TOUCH_TRIGGER_PX = 40; // past this (once committed vertical), the swipe fires

/** Soft in, long glide out — no bounce, no snap. */
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

type Stop = { y: number; why: boolean };

/** True if `node` sits inside a genuinely scrollable-Y ancestor (cart drawer
 *  list, search overlay, etc.) — those must keep their own native scroll. */
function isInsideScrollableOverlay(node: Node | null): boolean {
  while (node && node !== document.body) {
    if (node instanceof HTMLElement) {
      const overflowY = getComputedStyle(node).overflowY;
      if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 4) return true;
    }
    node = node.parentNode;
  }
  return false;
}

/** Sums offsetTop up the offsetParent chain — immune to reveal-animation transforms
 *  that would throw off a getBoundingClientRect-based measurement mid-transition. */
function docTop(el: HTMLElement): number {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

type Params = {
  mainRef: RefObject<HTMLElement>;
  whyRef: RefObject<WhyBagHandle>;
  enabled: boolean;
};

/**
 * Full-page "one gesture = snap to next/prev section" scroll system — one wheel
 * tick on desktop/trackpad, one vertical swipe on touch, each snapping the page
 * to the next/prev section (or stepping one bag inside the Why section first).
 * Attaches no listeners at all when `enabled` is false, so native scroll is
 * completely untouched.
 */
export function useHomeSnapScroll({ mainRef, whyRef, enabled }: Params) {
  const busyUntilRef = useRef(0);
  const lastWheelRef = useRef(0);
  const passThroughRef = useRef(false);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const main = mainRef.current;
    if (!main) return;

    const buildStops = (): Stop[] => {
      const vh = window.innerHeight;
      const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
      const stops: Stop[] = [];

      Array.from(main.children).forEach((child) => {
        const el = child as HTMLElement;
        const h = el.offsetHeight;
        if (h < vh * SLIVER_RATIO) return; // slivers (dividers) would snap to a blank screen

        const isWhy = el.hasAttribute("data-snap-why") || el.querySelector("[data-snap-why]") !== null;
        const top = docTop(el);
        if (isWhy) {
          stops.push({ y: top, why: true });
          return;
        }
        if (h <= vh * TALL_RATIO) {
          stops.push({ y: top - Math.max(0, (vh - h) / 2), why: false });
          return;
        }
        // Meaningfully taller than the viewport — page it into evenly-spanning stops.
        const pages = Math.ceil(h / vh);
        const span = pages > 1 ? (h - vh) / (pages - 1) : 0;
        for (let i = 0; i < pages; i++) stops.push({ y: top + i * span, why: false });
      });

      const clamped = stops.map((s) => ({
        why: s.why,
        y: Math.round(Math.max(0, Math.min(maxY, s.y))),
      }));

      // Drop near-duplicate stops; a Why stop always wins over its neighbour.
      const out: Stop[] = [];
      clamped.forEach((s) => {
        const prev = out[out.length - 1];
        if (prev && Math.abs(s.y - prev.y) < vh * DEDUPE_RATIO) {
          if (s.why) out[out.length - 1] = s;
          return;
        }
        out.push(s);
      });
      if (!out.length || maxY - out[out.length - 1].y > vh * DEDUPE_RATIO) {
        out.push({ why: false, y: maxY });
      }
      return out;
    };

    const animateTo = (y: number) => {
      animRef.current?.stop();
      const from = window.scrollY;
      const vh = window.innerHeight;
      const dist = Math.abs(y - from) / Math.max(1, vh);
      const durationMs = Math.min(PAGE_MAX_MS, PAGE_MIN_MS + dist * PAGE_PER_VH_MS);
      busyUntilRef.current = performance.now() + durationMs + PAGE_BUSY_PAD_MS;
      animRef.current = animate(from, y, {
        duration: durationMs / 1000,
        ease: easeInOutCubic,
        onUpdate: (v) => window.scrollTo(0, v),
        onComplete: () => {
          busyUntilRef.current = 0;
        },
      });
    };

    const snapStep = (dir: 1 | -1) => {
      const stops = buildStops();
      if (!stops.length) return;
      const y = window.scrollY;

      let idx = 0;
      let best = Infinity;
      stops.forEach((s, i) => {
        const d = Math.abs(s.y - y);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      const cur = stops[idx];

      // Parked on the Why section: walk the bags before releasing the page.
      if (cur.why && Math.abs(cur.y - y) < WHY_PARK_TOL_PX && whyRef.current) {
        const count = whyRef.current.count;
        const next = whyRef.current.getIndex() + dir;
        if (next >= 0 && next < count) {
          busyUntilRef.current = performance.now() + WHY_BUSY_MS;
          whyRef.current.stepTo(next);
          return;
        }
      }

      // Directional pick: first stop strictly PAST current position — nearest+dir
      // would skip a stop whenever the page sits just short of one.
      let target: Stop | null = null;
      if (dir > 0) {
        for (let i = 0; i < stops.length; i++) {
          if (stops[i].y > y + DIR_TOL_PX) {
            target = stops[i];
            break;
          }
        }
      } else {
        for (let i = stops.length - 1; i >= 0; i--) {
          if (stops[i].y < y - DIR_TOL_PX) {
            target = stops[i];
            break;
          }
        }
      }
      if (!target) {
        passThroughRef.current = true;
        return;
      }
      if (target.why && whyRef.current) {
        whyRef.current.jumpTo(dir > 0 ? 0 : whyRef.current.count - 1);
      }
      animateTo(target.y);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // protects horizontal wheel gestures (carousel)
      if (isInsideScrollableOverlay(e.target as Node)) return; // cart drawer, etc.

      const now = performance.now();
      const busy = now < busyUntilRef.current;
      const quiet = now - lastWheelRef.current > GESTURE_QUIET_MS;
      lastWheelRef.current = now;
      if (busy || !quiet || Math.abs(e.deltaY) < MIN_DELTA_Y) {
        e.preventDefault();
        return;
      }

      passThroughRef.current = false;
      snapStep(e.deltaY > 0 ? 1 : -1);
      if (!passThroughRef.current) e.preventDefault();
    };

    // ---- touch (mobile/tablet): one swipe = one section/bag, same snapStep ----
    const touch = {
      active: false,
      ignore: false, // started inside a scrollable overlay — hands off entirely
      startX: 0,
      startY: 0,
      committed: null as "x" | "y" | null,
      triggered: false,
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touch.active = false;
        return;
      }
      touch.active = true;
      touch.ignore = isInsideScrollableOverlay(e.target as Node);
      touch.startX = e.touches[0].clientX;
      touch.startY = e.touches[0].clientY;
      touch.committed = null;
      touch.triggered = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touch.active || touch.ignore || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touch.startX;
      const dy = e.touches[0].clientY - touch.startY;

      if (touch.committed === null) {
        if (Math.abs(dx) < TOUCH_DEADZONE_PX && Math.abs(dy) < TOUCH_DEADZONE_PX) return;
        touch.committed = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
      }
      if (touch.committed === "x") return; // horizontal swipe — leave to the carousel/native

      e.preventDefault(); // vertical swipe on the home page is ours from here on
      if (touch.triggered) return;

      const now = performance.now();
      if (now < busyUntilRef.current) return; // swallow input while a step is animating
      if (Math.abs(dy) < TOUCH_TRIGGER_PX) return;

      touch.triggered = true;
      snapStep(dy < 0 ? 1 : -1); // finger moved up = content advances = next section
    };

    const onTouchEnd = () => {
      touch.active = false;
      touch.ignore = false;
      touch.committed = null;
      touch.triggered = false;
    };

    // No-op: buildStops() re-measures fresh on every snapStep call already, so a
    // resize doesn't need to invalidate anything — kept only so mount/unmount
    // stays symmetric with the wheel listener below.
    const onResize = () => {};

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", onResize);
      animRef.current?.stop();
    };
  }, [enabled, mainRef, whyRef]);
}
