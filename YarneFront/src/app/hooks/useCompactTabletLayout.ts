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
 * Use the editorial magazine spread on every non-phone width.
 */
export const SPREAD_LAYOUT_MEDIA = "(min-width: 768px)";

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

export function useShowcaseSpreadLayout(): boolean {
  const [spread, setSpread] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(SPREAD_LAYOUT_MEDIA).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(SPREAD_LAYOUT_MEDIA);
    const onChange = () => setSpread(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return spread;
}
