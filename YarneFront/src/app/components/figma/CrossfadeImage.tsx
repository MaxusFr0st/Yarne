import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { resolveMediaUrl } from "../../utils/storefrontMedia";
import { ImageWithFallback, type FocalPoint } from "./ImageWithFallback";

/**
 * Symmetric, near-even easing — a dissolve, not an arrival. The previous curve here was
 * [0.22, 1, 0.36, 1], a hard ease-out meant for things travelling into place: it spent ~90% of
 * the fade in the first 100ms and the remaining 240ms creeping from 0.02 to 0, so a nominal
 * 360ms crossfade read as an instant swap. Opacity carries no sense of momentum, so it wants a
 * curve that actually spends its time on screen.
 */
const EASE_DISSOLVE = [0.37, 0, 0.63, 1] as const;
const FADE_MS = 420;

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
};

/**
 * Preloads the next src, keeps the previous frame visible, then crossfades.
 * Avoids the hard swap when color/size/lace changes gallery images.
 */
export function CrossfadeImage({
  src,
  alt,
  className = "",
  priority = false,
  focal,
  animate = true,
}: CrossfadeImageProps) {
  const reduceMotion = useReducedMotion();
  // Only a stated preference for less motion swaps hard. This used to include every touch
  // device, which meant the crossfade this component exists for never once ran on a phone —
  // where changing colour, size or strap is the whole interaction. The fade is opacity on two
  // stacked layers, which the compositor handles without touching the main thread, so there is
  // no phone-shaped reason to drop it.
  const instantSwap = reduceMotion || !animate;
  const resolved = src ? resolveMediaUrl(src) : "";
  // A photo and the point it is framed on are one thing, so they are stored as one thing. Held
  // apart — src in state, focal read straight from the prop — the visible photo was re-framed to
  // the *incoming* colour's focal point the moment the swatch was tapped, while still showing the
  // outgoing photo and before the new one had downloaded. That is a hard, unanimated jump of the
  // bag, and it happened every single time, ahead of the dissolve that was supposed to hide it.
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
    img.onload = settle;
    img.onerror = settle;
    img.src = resolved;
  }, [resolved, focal?.x, focal?.y, current, instantSwap]);

  useEffect(() => {
    if (!previous) return;
    const timer = window.setTimeout(() => setPrevious(null), FADE_MS + 40);
    return () => window.clearTimeout(timer);
  }, [previous]);

  const duration = instantSwap ? 0 : FADE_MS / 1000;

  return (
    // The incoming photo sits underneath at full opacity from its first frame, and the outgoing
    // one fades away on top of it. Fading the *new* photo in instead leaves the frame blank
    // whenever the animation cannot run — a throttled background tab, a stalled main thread —
    // because the `initial` opacity stays on the element until something animates it off, and
    // every product card on the site now renders through here. This way the worst case is the
    // previous photo lingering for one fade, and the timer above drops it whether the animation
    // ran or not, so a photo is on screen at every point in the swap.
    <div className="absolute inset-0 overflow-hidden bg-[#EDE9E2]">
      <div key={`cur-${current.src}`} className="absolute inset-0">
        <ImageWithFallback
          src={current.src}
          alt={alt}
          priority={priority}
          focal={current.focal}
          className={`h-full w-full object-cover ${className}`}
        />
      </div>
      {previous && !instantSwap && (
        <motion.div
          key={`prev-${previous.src}`}
          className="absolute inset-0"
          // Opacity only. A 2% scale drift on the outgoing photo read nicely on a desktop
          // but made iOS re-rasterize a full-bleed image every frame of the fade, and a
          // dissolve that stutters is worse than one without the flourish.
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration, ease: EASE_DISSOLVE }}
        >
          <ImageWithFallback
            src={previous.src}
            alt=""
            aria-hidden
            focal={previous.focal}
            className={`h-full w-full object-cover ${className}`}
          />
        </motion.div>
      )}
    </div>
  );
}
