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

/** Soft in, long glide out — no bounce, no snap. */
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

type Stop = { y: number; why: boolean };

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
 * Desktop/trackpad-only full-page "one wheel gesture = snap to next/prev section"
 * scroll system. Attaches no listeners at all when `enabled` is false, so native
 * (and all mobile touch) scrolling is completely untouched.
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

      // Protects any scrollable overlay (cart drawer, etc.) under the cursor.
      let node = e.target as Node | null;
      while (node && node !== document.body) {
        if (node instanceof HTMLElement) {
          const overflowY = getComputedStyle(node).overflowY;
          if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 4) return;
        }
        node = node.parentNode;
      }

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

    // No-op: buildStops() re-measures fresh on every snapStep call already, so a
    // resize doesn't need to invalidate anything — kept only so mount/unmount
    // stays symmetric with the wheel listener below.
    const onResize = () => {};

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      animRef.current?.stop();
    };
  }, [enabled, mainRef, whyRef]);
}
