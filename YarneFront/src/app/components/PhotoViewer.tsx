import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useReducedMotion } from "motion/react";

/** Where a photo sits on the page, so the viewer can grow out of it and shrink back into it. */
export type PhotoOrigin = {
  rect: DOMRect;
  objectPosition: string;
  /** How much of the photo's bottom the page covers (the info sheet overlaps it); the copy is cut there on the page end. */
  coveredBottom?: number;
};

type PhotoViewerProps = {
  photos: { src: string; focalX?: number; focalY?: number }[];
  startIndex: number;
  alt: string;
  /** The page photo's place and crop for a given photo (the gallery shows it there); null if unknown. */
  getOrigin: (index: number) => PhotoOrigin | null;
  /** Right before closing: the page should show this photo, so the viewer shrinks back onto it. */
  onBeforeClose: (index: number) => void;
  onClose: (index: number) => void;
};

const MAX_SCALE = 4;
const SWIPE_DISTANCE = 0.18; // of the screen width
// Fast start, gentle landing: opening, closing and sliding between photos all use it.
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const FLIGHT_MS = 420;
const FADE_OUT_MS = 180;
const BACKGROUND = "243, 239, 232"; // #F3EFE8

type Point = { x: number; y: number };

/** The next frame, or a short timeout if the browser holds frames back: the viewer never waits forever. */
function nextFrame(cb: () => void): () => void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cb();
  };
  const raf = requestAnimationFrame(run);
  const timer = window.setTimeout(run, 60);
  return () => {
    done = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
  };
}

/**
 * Phones: a product's photos over the whole screen (opened by a tap on the gallery). Swipe between
 * photos, two fingers to zoom in (1x to 4x) and one finger to look around while zoomed. No double
 * tap. It is as tall as the screen with the browser's bars hidden (100lvh), so it runs under
 * Safari's floating bars like the page does, and that height never changes while the bars slide
 * in and out, so the photo does not resize.
 */
export function PhotoViewer({ photos, startIndex, alt, getOrigin, onBeforeClose, onClose }: PhotoViewerProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(startIndex);
  // "opening" and "closing": a copy of the photo travels between the page and the screen while the
  // background fades; the real photos and the controls appear once it has landed.
  const [phase, setPhase] = useState<"opening" | "open" | "closing">("opening");
  const flyRef = useRef<HTMLDivElement>(null);
  const flyImgRef = useRef<HTMLImageElement>(null);
  const [flySrc, setFlySrc] = useState(photos[startIndex]?.src ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Gesture state lives in refs: it changes on every finger move and must not re-render.
  const pointers = useRef(new Map<number, Point>());
  const drag = useRef<{ startX: number; startY: number; dx: number; horizontal: boolean | null } | null>(null);
  const zoom = useRef({ scale: 1, x: 0, y: 0 });
  const pinch = useRef<{ distance: number; scale: number; mid: Point; x: number; y: number } | null>(null);
  const pan = useRef<{ start: Point; x: number; y: number } | null>(null);

  const duration = reduceMotion ? 0 : FLIGHT_MS;

  const placeTrack = useCallback(
    (offsetPx: number, animate: boolean) => {
      const track = trackRef.current;
      if (!track) return;
      track.style.transition = animate && duration ? `transform ${duration}ms ${EASE}` : "none";
      track.style.transform = `translate3d(calc(${-index * 100}% + ${offsetPx}px), 0, 0)`;
    },
    [index, duration],
  );

  const applyZoom = useCallback((animate: boolean) => {
    const img = imageRefs.current[index];
    if (!img) return;
    const { scale, x, y } = zoom.current;
    img.style.transition = animate && duration ? `transform 220ms ${EASE}` : "none";
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, [index, duration]);

  /** Keeps a zoomed photo covering the screen: it cannot be dragged past its own edges. */
  const clampPan = () => {
    const root = rootRef.current;
    if (!root) return;
    const { scale } = zoom.current;
    const maxX = (root.clientWidth * (scale - 1)) / 2;
    const maxY = (root.clientHeight * (scale - 1)) / 2;
    zoom.current.x = Math.min(maxX, Math.max(-maxX, zoom.current.x));
    zoom.current.y = Math.min(maxY, Math.max(-maxY, zoom.current.y));
  };

  const resetZoom = useCallback((animate: boolean) => {
    zoom.current = { scale: 1, x: 0, y: 0 };
    applyZoom(animate);
  }, [applyZoom]);

  /** Where a photo sits on the open viewer: the whole screen, letterboxed to the photo's own shape. */
  const landedRect = useCallback((i: number) => {
    const root = rootRef.current;
    const width = root?.clientWidth ?? window.innerWidth;
    const height = root?.clientHeight ?? window.innerHeight;
    const img = imageRefs.current[i];
    const ratio = img && img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 3 / 4;
    const w = Math.min(width, height * ratio);
    const h = w / ratio;
    return { left: (width - w) / 2, top: (height - h) / 2, width: w, height: h };
  }, []);

  /**
   * Moves the travelling copy from one box to another. At the page end it is cropped like the page
   * photo (same box, same focal point); on the screen it is the whole photo, so the hand-over to the
   * real photo underneath is seamless either way.
   */
  const flight = useCallback(
    (
      from: { left: number; top: number; width: number; height: number },
      to: { left: number; top: number; width: number; height: number },
      fromPosition: string,
      toPosition: string,
      fromCut: number,
      toCut: number,
      done: () => void,
    ) => {
      const fly = flyRef.current;
      const img = flyImgRef.current;
      if (!fly || !img || !duration) {
        done();
        return;
      }
      const set = (box: typeof from, position: string) => {
        fly.style.transform = `translate3d(${box.left}px, ${box.top}px, 0)`;
        fly.style.width = `${box.width}px`;
        fly.style.height = `${box.height}px`;
        img.style.objectPosition = position;
      };
      const cut = (px: number) => `inset(0 0 ${px}px 0)`;
      fly.style.transition = "none";
      img.style.transition = "none";
      set(from, fromPosition);
      fly.style.clipPath = cut(fromCut);
      fly.style.visibility = "visible";
      void fly.offsetWidth; // start from `from` before moving
      const motion = `${FLIGHT_MS}ms ${EASE}`;
      fly.style.transition = `transform ${motion}, width ${motion}, height ${motion}, clip-path ${motion}`;
      img.style.transition = `object-position ${motion}`;
      set(to, toPosition);
      fly.style.clipPath = cut(toCut);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        done();
      };
      fly.addEventListener("transitionend", (event) => { if (event.propertyName === "width") finish(); }, { once: true });
      window.setTimeout(finish, FLIGHT_MS + 80);
    },
    [duration],
  );

  const close = useCallback(() => {
    if (phase === "closing") return;
    if (phase === "opening") {
      // Closed before it finished opening: just go.
      onClose(index);
      return;
    }
    resetZoom(false);
    onBeforeClose(index);
    setFlySrc(photos[index]?.src ?? "");
    setPhase("closing");
    // One frame for the page to show this photo and for the copy to take its picture.
    nextFrame(() => {
      const origin = getOrigin(index);
      if (!origin) {
        onClose(index);
        return;
      }
      flight(landedRect(index), origin.rect, "50% 50%", origin.objectPosition, 0, origin.coveredBottom ?? 0, () => {
        // Landed on the page photo. Removing the copy at once made the page snap: Safari only
        // repaints what was under the full-screen viewer (the gallery dots, the sheet's rounded
        // corners, the part under its bar) once it is gone. So the copy dissolves over the page,
        // which has those frames to paint underneath, and only then the viewer goes.
        const fly = flyRef.current;
        if (!fly) return onClose(index);
        fly.style.transition = `opacity ${FADE_OUT_MS}ms ease-out`;
        fly.style.opacity = "0";
        window.setTimeout(() => onClose(index), FADE_OUT_MS + 20);
      });
    });
  }, [phase, index, photos, getOrigin, onBeforeClose, onClose, flight, landedRect, resetZoom]);

  // Grow out of the page photo, focus the close button; Escape closes; the page behind cannot scroll.
  useEffect(() => {
    const origin = getOrigin(startIndex);
    const cancel = nextFrame(() => {
      if (!origin) {
        setPhase("open");
        return;
      }
      flight(origin.rect, landedRect(startIndex), origin.objectPosition, "50% 50%", origin.coveredBottom ?? 0, 0, () => setPhase("open"));
    });
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((i) => Math.min(photos.length - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    const root = rootRef.current;
    const block = (event: TouchEvent) => event.preventDefault();
    root?.addEventListener("touchmove", block, { passive: false });
    return () => {
      cancel();
      window.removeEventListener("keydown", onKey);
      root?.removeEventListener("touchmove", block);
    };
    // Once, on opening: the origin and the start photo are read only then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape and the arrow keys; kept apart so a re-render never restarts the opening.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // A new photo: slide there smoothly and start it unzoomed.
  useEffect(() => {
    placeTrack(0, true);
    imageRefs.current.forEach((img, i) => {
      if (img && i !== index) {
        img.style.transition = "none";
        img.style.transform = "";
      }
    });
    zoom.current = { scale: 1, x: 0, y: 0 };
  }, [index, placeTrack]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (phase !== "open") return;
    // Keeps the finger's moves coming even if it slides off the photo. It can refuse (a pointer the
    // browser no longer tracks); the gesture works without it.
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      // Two fingers: zoom. Any swipe in progress is dropped and the track goes back in place.
      drag.current = null;
      pan.current = null;
      placeTrack(0, true);
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: zoom.current.scale,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        x: zoom.current.x,
        y: zoom.current.y,
      };
    } else if (pointers.current.size === 1) {
      if (zoom.current.scale > 1) pan.current = { start: { x: event.clientX, y: event.clientY }, x: zoom.current.x, y: zoom.current.y };
      else drag.current = { startX: event.clientX, startY: event.clientY, dx: 0, horizontal: null };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const root = rootRef.current;
    if (!root) return;

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance;
      const scale = Math.min(MAX_SCALE, Math.max(1, pinch.current.scale * ratio));
      // Zoom around the point between the fingers, and follow the fingers as they move.
      const rect = root.getBoundingClientRect();
      const cx = pinch.current.mid.x - rect.left - rect.width / 2;
      const cy = pinch.current.mid.y - rect.top - rect.height / 2;
      const k = scale / pinch.current.scale;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoom.current.scale = scale;
      zoom.current.x = cx - (cx - pinch.current.x) * k + (mid.x - pinch.current.mid.x);
      zoom.current.y = cy - (cy - pinch.current.y) * k + (mid.y - pinch.current.mid.y);
      clampPan();
      applyZoom(false);
      return;
    }

    if (pan.current) {
      zoom.current.x = pan.current.x + (event.clientX - pan.current.start.x);
      zoom.current.y = pan.current.y + (event.clientY - pan.current.start.y);
      clampPan();
      applyZoom(false);
      return;
    }

    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    if (d.horizontal === null && Math.hypot(dx, dy) > 6) d.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!d.horizontal) return;
    // Past the first or last photo the track only gives a little.
    const atEdge = (index === 0 && dx > 0) || (index === photos.length - 1 && dx < 0);
    d.dx = atEdge ? dx * 0.3 : dx;
    placeTrack(d.dx, false);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) {
        pinch.current = null;
        if (zoom.current.scale < 1.05) resetZoom(true);
        // One finger still down after a pinch: carry on as a pan from here.
        const rest = [...pointers.current.values()][0];
        if (rest && zoom.current.scale > 1) pan.current = { start: rest, x: zoom.current.x, y: zoom.current.y };
      }
      return;
    }
    if (pan.current) {
      if (pointers.current.size === 0) pan.current = null;
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (!d || !d.horizontal) return;
    const width = rootRef.current?.clientWidth ?? window.innerWidth;
    if (d.dx < -width * SWIPE_DISTANCE && index < photos.length - 1) setIndex(index + 1);
    else if (d.dx > width * SWIPE_DISTANCE && index > 0) setIndex(index - 1);
    else placeTrack(0, true);
  };

  const backdrop = {
    backgroundColor: `rgba(${BACKGROUND}, ${phase === "closing" ? 0 : 1})`,
    animation: phase === "opening" && duration ? `photo-viewer-in ${FLIGHT_MS}ms ${EASE} both` : undefined,
    transition: duration ? `background-color ${FLIGHT_MS}ms ${EASE}` : undefined,
  };

  return createPortal(
    <>
    {/* The sand background on its own plain layer, like the cart's backdrop: on iPhone Safari
        paints a plain fixed layer down under its bar, but cuts the viewer (it holds moving photos)
        off short of it, which let the page show through there. */}
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[120]" style={{ height: "calc(var(--app-svh) + var(--browser-bar-b))", ...backdrop }}>
      {/* Exactly the cart's setup: the backdrop alone still stopped short of the bar on iPhone,
          an explicit strip from the screen line down is what Safari paints under it. */}
      <div className="absolute inset-x-0" style={{ top: "var(--app-svh)", height: "var(--browser-bar-b)", backgroundColor: "inherit" }} />
    </div>
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      // Exactly as tall as the part Safari actually shows of it (it cuts this layer off at the large
      // viewport line), so the photo is centred in what the shopper sees; below that is the backdrop.
      className="fixed left-0 top-0 z-[120] h-[var(--app-svh)] supports-[height:100lvh]:h-lvh w-full overflow-hidden select-none"
      style={{
        touchAction: "none",
        overscrollBehavior: "contain",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={trackRef} className="flex h-full" style={{ willChange: "transform", transform: `translate3d(${-startIndex * 100}%, 0, 0)`, visibility: phase === "open" ? "visible" : "hidden" }}>
        {photos.map((photo, i) => (
          <div key={`${photo.src}-${i}`} className="relative h-full w-full shrink-0 overflow-hidden">
            <img
              ref={(el) => { imageRefs.current[i] = el; }}
              src={photo.src}
              alt={`${alt} – ${i + 1}`}
              draggable={false}
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
              style={{ transformOrigin: "50% 50%", willChange: i === index ? "transform" : undefined }}
            />
          </div>
        ))}
      </div>

      <button
        ref={closeRef}
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={close}
        aria-label={t("product.closePhotos")}
        className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-[4px] bg-white text-[#2D241E] cursor-pointer transition-opacity duration-200"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)", opacity: phase === "open" ? 1 : 0 }}
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      {photos.length > 1 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex gap-1 transition-opacity duration-200"
          style={{ bottom: "calc(max(100lvh - var(--app-svh), 0px) + 18px)", opacity: phase === "open" ? 1 : 0 }}
          aria-hidden="true"
        >
          {photos.map((_, i) => (
            <span
              key={i}
              className="block h-[2px] w-4 transition-colors duration-300"
              style={{ backgroundColor: i === index ? "#2D241E" : "rgba(45,36,30,0.25)" }}
            />
          ))}
        </div>
      )}

      {/* The travelling copy (opening and closing only). */}
      <div
        ref={flyRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 overflow-hidden"
        style={{ visibility: "hidden", willChange: "transform, width, height", display: phase === "open" ? "none" : "block" }}
      >
        <img ref={flyImgRef} src={flySrc} alt="" draggable={false} className="h-full w-full object-cover" />
      </div>
    </div>
    </>,
    document.body,
  );
}
