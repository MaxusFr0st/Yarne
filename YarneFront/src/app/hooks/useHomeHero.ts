import { useEffect, useState } from "react";
import { peekCurrentStorefrontSetting, peekStorefrontSetting } from "../api/storefrontSettings";
import {
  HOME_PAGE_COPY_KEY,
  getInitialHomePageCopy,
  loadHomePageCopy,
  normalizeHomePageCopy,
  type HomePageCopy,
} from "../utils/homePageCopy";
import {
  HOME_PAGE_MEDIA_KEY,
  getInitialHomePageMediaSelection,
  loadHomePageMediaSelection,
  normalizeHomePageMediaSelection,
  type HomePageMediaSelection,
} from "../utils/homePageMediaSelection";
import { resolveMediaUrl } from "../utils/storefrontMedia";

/** A returning visitor waits at most this long for the current hero before seeing the saved one. */
const SLOW_SERVER_MS = 1500;
/** A first visit has nothing saved to fall back on; same cap as useFirstVisitReady. */
const FIRST_VISIT_MAX_WAIT_MS = 3000;

export type HomeHero = { copy: HomePageCopy; media: HomePageMediaSelection };

/** The server's current hero, if its answer already arrived (src/early.ts asks before the app starts). */
function currentHero(): HomeHero | undefined {
  const copy = peekCurrentStorefrontSetting(HOME_PAGE_COPY_KEY);
  const media = peekCurrentStorefrontSetting(HOME_PAGE_MEDIA_KEY);
  if (!copy || !media) return undefined;
  return {
    copy: normalizeHomePageCopy(copy.value ?? {}),
    media: normalizeHomePageMediaSelection(media.value ?? {}),
  };
}

function savedHero(): HomeHero {
  return { copy: getInitialHomePageCopy(), media: getInitialHomePageMediaSelection() };
}

/**
 * Resolves once the photo has downloaded (at once when the browser already has it). Not
 * decode(): decoding a large photo takes a slow phone a few hundred milliseconds, and the hero's
 * own fade-in (ImageWithFallback `fadeIn`) already covers that.
 */
function photoReady(url: string): Promise<void> {
  const src = resolveMediaUrl(url.trim());
  if (!src) return Promise.resolve();
  const img = new Image();
  img.src = src;
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.onload = img.onerror = () => resolve();
  });
}

/**
 * The hero is on screen the moment the page appears, so it must never change in front of the
 * visitor: not from built-in defaults, and not from the copy saved on an earlier visit either.
 * `ready` turns true once the server's current hero is known (at once when src/early.ts already
 * has it, else when it and its photo arrive), and that hero is kept for the whole visit. If the
 * server is slow, the saved hero is shown instead and kept; a newer one is then saved for the
 * next visit (storefrontSettings.ts) but not swapped in.
 */
export function useHomeHero(): { hero: HomeHero; ready: boolean } {
  // Current already (the usual case, even on a first visit): show it on the first render. Holding
  // the page back to wait for the photo would cost a whole extra render of the page, a few
  // hundred milliseconds on a phone, and the photo's own fade-in covers it anyway.
  const [state, setState] = useState(() => {
    const current = currentHero();
    return { hero: current ?? savedHero(), ready: Boolean(current) };
  });

  useEffect(() => {
    let shown = state.ready;
    let latest: HomeHero | undefined;
    const show = (hero: HomeHero) => {
      if (shown) return;
      shown = true;
      setState({ hero, ready: true });
    };
    if (shown) {
      // Still load: that is what saves the answer for the next visit.
      void Promise.all([loadHomePageCopy(), loadHomePageMediaSelection()]);
      return;
    }
    const returning = [HOME_PAGE_COPY_KEY, HOME_PAGE_MEDIA_KEY].every((key) => peekStorefrontSetting(key) !== undefined);
    // Whatever is known by then: the current hero if it came but its photo is still loading.
    const timer = window.setTimeout(
      () => show(latest ?? savedHero()),
      returning ? SLOW_SERVER_MS : FIRST_VISIT_MAX_WAIT_MS,
    );
    void Promise.all([loadHomePageCopy(), loadHomePageMediaSelection()]).then(async ([copy, media]) => {
      latest = { copy, media };
      await photoReady(media.heroImageUrl);
      show(latest);
    });
    return () => {
      shown = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
