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

type CrossfadeImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  focal?: FocalPoint;
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
}: CrossfadeImageProps) {
  const reduceMotion = useReducedMotion();
  // Only a stated preference for less motion swaps hard. This used to include every touch
  // device, which meant the crossfade this component exists for never once ran on a phone —
  // where changing colour, size or strap is the whole interaction. The fade is opacity on two
  // stacked layers, which the compositor handles without touching the main thread, so there is
  // no phone-shaped reason to drop it.
  const instantSwap = reduceMotion;
  const resolved = src ? resolveMediaUrl(src) : "";
  const [currentSrc, setCurrentSrc] = useState(resolved);
  const [previousSrc, setPreviousSrc] = useState<string | null>(null);
  const [previousFocal, setPreviousFocal] = useState<FocalPoint | undefined>(undefined);
  const pendingRef = useRef<string | null>(null);
  const currentFocalRef = useRef(focal);
  currentFocalRef.current = focal;

  useEffect(() => {
    if (!resolved || resolved === currentSrc) return;

    if (instantSwap) {
      pendingRef.current = null;
      setPreviousSrc(null);
      setCurrentSrc(resolved);
      return;
    }

    pendingRef.current = resolved;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (pendingRef.current !== resolved) return;
      setPreviousFocal(currentFocalRef.current);
      setPreviousSrc(currentSrc || null);
      setCurrentSrc(resolved);
      pendingRef.current = null;
    };
    img.onerror = () => {
      if (pendingRef.current !== resolved) return;
      setPreviousFocal(currentFocalRef.current);
      setPreviousSrc(currentSrc || null);
      setCurrentSrc(resolved);
      pendingRef.current = null;
    };
    img.src = resolved;
  }, [resolved, currentSrc, instantSwap]);

  useEffect(() => {
    if (!previousSrc) return;
    const timer = window.setTimeout(() => setPreviousSrc(null), FADE_MS + 40);
    return () => window.clearTimeout(timer);
  }, [previousSrc, currentSrc]);

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
      <div key={`cur-${currentSrc}`} className="absolute inset-0">
        <ImageWithFallback
          src={currentSrc}
          alt={alt}
          priority={priority}
          focal={focal}
          className={`h-full w-full object-cover ${className}`}
        />
      </div>
      {previousSrc && !instantSwap && (
        <motion.div
          key={`prev-${previousSrc}`}
          className="absolute inset-0"
          // The outgoing photo also drifts back by a breath as it dissolves. Barely a
          // percent — enough to read as the old bag receding rather than a flat pixel
          // blend, and it scales up so no edge is ever uncovered inside the clipped frame.
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 1.02 }}
          transition={{ duration, ease: EASE_DISSOLVE }}
        >
          <ImageWithFallback
            src={previousSrc}
            alt=""
            aria-hidden
            focal={previousFocal}
            className={`h-full w-full object-cover ${className}`}
          />
        </motion.div>
      )}
    </div>
  );
}
