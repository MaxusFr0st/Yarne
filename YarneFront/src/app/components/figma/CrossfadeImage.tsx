import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { resolveMediaUrl } from "../../utils/storefrontMedia";
import { ImageWithFallback, type FocalPoint } from "./ImageWithFallback";

/**
 * A true cross-dissolve: the incoming photo sits underneath at full opacity and the outgoing
 * one fades away on top of it. Every pixel is a weighted mix of the two photos, and the sum of
 * the weights is always 1 — so the frame never dips toward the surface colour and never
 * brightens. The composite is `a·outgoing + (1-a)·incoming` at every moment.
 *
 * This replaces a veil: the surface swept over the frame, the old photo was swapped underneath
 * it, and the surface cleared. It avoided blending two photos, but it did so by passing the
 * whole frame through the background colour, which reads as a flash to white and looks like a
 * transition between two slides rather than one garment becoming another.
 *
 * The fade is a CSS animation rather than a JS one for the same reason the route enter is:
 * opacity 1 is the resting state, so a fade that never starts leaves the outgoing photo
 * visible until the timer below drops it — a hard cut, which is survivable. A JS fade that
 * stalls mid-flight strands a half-transparent ghost of the old photo on screen permanently.
 */
const DISSOLVE_MS = 420;

/** Ceiling on waiting for the incoming photo to decode before swapping anyway. */
const DECODE_CAP_MS = 900;

/** A photo and the point it is framed on. They are only ever correct together. */
type Frame = { src: string; focal?: FocalPoint };

type CrossfadeImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  focal?: FocalPoint;
  /**
   * False for a frame nobody is looking at — an off-screen carousel slide swaps instantly
   * instead of paying for a fade no one can see. The mobile gallery holds one of these per
   * photo, so without this a colour change ran every slide's crossfade at once and iOS had to
   * decode and composite two full-size photos per slide in the same frames.
   */
  animate?: boolean;
  /**
   * Loading strategy for the resting photo. Left unset it inherits ImageWithFallback's lazy
   * default, which is what a grid of product cards wants. The product gallery passes "eager"
   * because its slides sit off-viewport inside the carousel track: lazy there means WebKit
   * does not fetch photo 2 until you have already swiped to it and are waiting on it.
   *
   * A swap overrides this regardless — see below.
   */
  loading?: "eager" | "lazy";
};

/**
 * Preloads the next src, keeps the previous frame visible, then cross-dissolves.
 * Avoids the hard swap when color/size/lace changes gallery images.
 */
export function CrossfadeImage({
  src,
  alt,
  className = "",
  priority = false,
  focal,
  animate = true,
  loading,
}: CrossfadeImageProps) {
  const reduceMotion = useReducedMotion();
  // Only a stated preference for less motion swaps hard. This used to include every touch
  // device, which meant the crossfade this component exists for never once ran on a phone —
  // where changing colour, size or strap is the whole interaction.
  const instantSwap = reduceMotion || !animate;
  const resolved = src ? resolveMediaUrl(src) : "";
  // A photo and the point it is framed on are one thing, so they are stored as one thing. Held
  // apart — src in state, focal read straight from the prop — the visible photo was re-framed to
  // the *incoming* colour's focal point the moment the swatch was tapped, while still showing the
  // outgoing photo and before the new one had downloaded. That is a hard, unanimated jump.
  const [current, setCurrent] = useState<Frame>(() => ({ src: resolved, focal }));
  const [previous, setPrevious] = useState<Frame | null>(null);
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!resolved) return;
    const next: Frame = { src: resolved, focal };

    if (resolved === current.src) {
      // Same photo, re-framed (two variants can share a photo and differ only in focal point).
      // Nothing to dissolve between, so just adopt the new framing.
      if (current.focal?.x !== focal?.x || current.focal?.y !== focal?.y) setCurrent(next);
      return;
    }

    if (instantSwap) {
      pendingRef.current = null;
      setPrevious(null);
      setCurrent(next);
      return;
    }

    pendingRef.current = resolved;
    const settle = () => {
      if (pendingRef.current !== resolved) return;
      setPrevious(current);
      setCurrent(next);
      pendingRef.current = null;
    };
    const img = new Image();
    img.decoding = "async";
    // `onload` only says the bytes arrived; it does not say the frame can be painted. The
    // dissolve is timed against the moment the new photo appears, and on iOS the gap between
    // "loaded" and "decoded" is easily long enough to start fading onto a blank frame.
    img.onload = () => {
      if (typeof img.decode !== "function") return settle();
      img.decode().then(settle, settle);
    };
    img.onerror = settle;
    img.src = resolved;

    // decode() is allowed to simply never settle — a hidden document is the easy case to
    // reproduce, and iOS suspends decoding under memory pressure too. Left unbounded that
    // does not degrade the animation, it cancels the interaction: the swatch reads as
    // selected and the photo never changes. Past this point a swap without the dissolve is
    // strictly better than no swap.
    const cap = window.setTimeout(settle, DECODE_CAP_MS);
    return () => window.clearTimeout(cap);
  }, [resolved, focal?.x, focal?.y, current, instantSwap]);

  // The outgoing photo is dropped on a timer rather than on the animation's completion, so a
  // frame that could not animate still lands on the new photo instead of holding the old one
  // forever. The extra frame past the duration is so removal never clips the tail of the fade.
  useEffect(() => {
    if (!previous) return;
    const timer = window.setTimeout(() => setPrevious(null), DISSOLVE_MS + 40);
    return () => window.clearTimeout(timer);
  }, [previous]);

  const layers = previous && !instantSwap ? [current, previous] : [current];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#EDE9E2]">
      {/* One keyed list, not two role-prefixed slots. Rendered as `cur-${src}` and `prev-${src}`
          in fixed positions, the photo already on screen changed key the instant it became the
          outgoing one, so React destroyed its <img> and built a fresh one — and a freshly built
          <img> does not paint in the same frame in WebKit, even when the file is cached, so iOS
          showed bare surface where the bag had been. Keyed by src alone, React moves the node
          instead of rebuilding it and the outgoing photo never stops being painted.
          Later child = on top, so the outgoing photo is the one that fades. */}
      {layers.map((frame, index) => {
        const outgoing = index > 0;
        return (
          <div
            key={frame.src}
            className={`absolute inset-0 ${outgoing ? "crossfade-out" : ""}`}
          >
            <ImageWithFallback
              src={frame.src}
              alt={outgoing ? "" : alt}
              {...(outgoing ? { "aria-hidden": true } : {})}
              priority={priority && !outgoing}
              // Mid-swap both layers are on screen — the outgoing one is what you are looking
              // at and the incoming one is what it dissolves into — so neither may be lazy,
              // whatever the caller asked for at rest. Outside a swap the caller decides, which
              // is what keeps a grid of product cards from fetching every photo at once.
              loading={previous ? "eager" : loading}
              focal={frame.focal}
              className={`h-full w-full object-cover ${className}`}
            />
          </div>
        );
      })}
    </div>
  );
}
