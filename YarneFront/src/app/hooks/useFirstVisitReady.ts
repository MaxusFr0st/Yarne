import { useEffect, useState, type CSSProperties } from "react";

/** A slow or unreachable server never keeps a page blank longer than this. */
const FIRST_VISIT_MAX_WAIT_MS = 3000;

/**
 * Whether a page may show its content yet.
 *
 * Pages start from the last server answer this browser saw (storefrontSettings.ts and
 * productsCache.ts remember them), so for a returning visitor this is true at once. On a first
 * visit there is nothing to start from: rather than paint the built-in defaults and swap them a
 * moment later, the page stays hidden until `load` settles (or the cap passes), then fades in.
 *
 * `isCached` and `load` are read once, on mount.
 */
export function useFirstVisitReady(isCached: () => boolean, load: () => Promise<unknown>): boolean {
  const [ready, setReady] = useState(isCached);
  useEffect(() => {
    if (ready) return;
    let done = false;
    const reveal = () => {
      if (!done) setReady(true);
      done = true;
    };
    const timer = window.setTimeout(reveal, FIRST_VISIT_MAX_WAIT_MS);
    void load().then(reveal, reveal);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ready;
}

/** Style for the element a first-visit gate hides and then fades in. */
export function firstVisitRevealStyle(ready: boolean, reducedMotion: boolean): CSSProperties {
  return {
    opacity: ready ? 1 : 0,
    transition: reducedMotion ? undefined : "opacity 360ms ease-out",
  };
}
