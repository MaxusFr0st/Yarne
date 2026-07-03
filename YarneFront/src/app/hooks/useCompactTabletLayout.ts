import { useEffect, useState } from "react";

/**
 * Tablets, foldables, and short landscape displays (Nest Hub, Zenbook Fold half-mode)
 * where the desktop showcase grid and tall product cards do not fit well.
 */
export const COMPACT_TABLET_MEDIA =
  "(max-width: 1279px), (max-height: 750px)";

/** Viewports too short for a free-flowing bento (Nest Hub, landscape phones). */
export const SHORT_VIEWPORT_MEDIA = "(max-height: 800px)";

/**
 * Tablet landscape + short wide viewports — use horizontal lookbook rail
 * instead of portrait bento (Nest Hub, iPad landscape, Zenbook Fold).
 */
export const LANDSCAPE_TABLET_MEDIA =
  "(min-width: 768px) and (max-width: 1279px) and (orientation: landscape), (min-width: 768px) and (max-height: 800px) and (min-aspect-ratio: 5/4)";

export function useCompactTabletLayout(): boolean {
  const [compact, setCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(COMPACT_TABLET_MEDIA).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_TABLET_MEDIA);
    const onChange = () => setCompact(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return compact;
}

export function useShortViewport(): boolean {
  const [short, setShort] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(SHORT_VIEWPORT_MEDIA).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(SHORT_VIEWPORT_MEDIA);
    const onChange = () => setShort(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return short;
}

export function useLandscapeTablet(): boolean {
  const [landscape, setLandscape] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(LANDSCAPE_TABLET_MEDIA).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(LANDSCAPE_TABLET_MEDIA);
    const onChange = () => setLandscape(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return landscape;
}
