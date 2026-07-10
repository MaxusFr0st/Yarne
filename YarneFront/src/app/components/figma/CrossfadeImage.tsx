import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTouchMobileLayout } from "../../hooks/useTouchMobileLayout";
import { resolveMediaUrl } from "../../utils/storefrontMedia";
import { ImageWithFallback } from "./ImageWithFallback";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const FADE_MS = 360;

type CrossfadeImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  objectPosition?: string;
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
  objectPosition,
}: CrossfadeImageProps) {
  const reduceMotion = useReducedMotion();
  const touchMobile = useTouchMobileLayout();
  const instantSwap = touchMobile || reduceMotion;
  const resolved = src ? resolveMediaUrl(src) : "";
  const [currentSrc, setCurrentSrc] = useState(resolved);
  const [previousSrc, setPreviousSrc] = useState<string | null>(null);
  const pendingRef = useRef<string | null>(null);

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
      setPreviousSrc(currentSrc || null);
      setCurrentSrc(resolved);
      pendingRef.current = null;
    };
    img.onerror = () => {
      if (pendingRef.current !== resolved) return;
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
    <div className="absolute inset-0 overflow-hidden bg-[#EDE9E2]">
      {previousSrc && !instantSwap && (
        <motion.div
          key={`prev-${previousSrc}`}
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration, ease: EASE_OUT }}
        >
          <ImageWithFallback
            src={previousSrc}
            alt=""
            aria-hidden
            className={`h-full w-full object-cover ${className}`}
            style={objectPosition ? { objectPosition } : undefined}
          />
        </motion.div>
      )}
      <motion.div
        key={`cur-${currentSrc}`}
        className="absolute inset-0"
        initial={previousSrc && !instantSwap ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration, ease: EASE_OUT }}
      >
        <ImageWithFallback
          src={currentSrc}
          alt={alt}
          priority={priority}
          className={`h-full w-full object-cover ${className}`}
          style={objectPosition ? { objectPosition } : undefined}
        />
      </motion.div>
    </div>
  );
}
