/**
 * Keeps full-height sections one fixed size inside in-app browsers (Instagram, Facebook, TikTok...).
 *
 * The webview there is not the whole screen: the app's own bars sit above and below it and slide
 * away as the page scrolls, and every time they do the webview itself is resized. Safari's
 * collapsing URL bar leaves svh alone and only moves lvh, but a resized webview has no separate
 * "small" and "large" viewport - 100svh, 100lvh, 100dvh and window.innerHeight all follow the
 * bars. Every section sized from them then re-lays out on each scroll nudge: content anchored to
 * a section's bottom slides, the pinned "why" frame rescales and its photos re-crop.
 *
 * So the height is measured once and held. --app-svh only ever shrinks (the layout never ends up
 * taller than what the visitor can see when the bars are out) and starts over when the width
 * changes, i.e. on rotation. --browser-bar-b, the strip full-height sections add below their
 * content so the room the bars hand back shows the section's own background rather than the
 * next section, becomes the gap between that height and the screen. Together each full-height
 * section is a constant screen tall whichever bars are showing.
 *
 * The hold starts from the shortest height seen so far, so a page opened while the bars are
 * already out (a full reload after scrolling down) would start tall and jump the first time they
 * come back. To avoid that the shortest height is remembered per device and reused as the
 * starting point; only a device's very first visit can still adjust once.
 *
 * Everywhere else --app-svh is plain 100svh (theme.css) and none of this runs.
 */
const IN_APP_UA = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|LinkedInApp|\bLine\//i;

/** The most a pair of app bars can take off the viewport; a bigger drop is a keyboard or a resized window. */
const MAX_BAR_TRAVEL_PX = 220;
/** Same ceiling browserBarInset.ts uses for the strip. */
const MAX_STRIP_PX = 240;
/** Rotation reports width and height at different moments; wait for both to settle. */
const ROTATION_SETTLE_MS = 300;
/** A height is only remembered once it has held this long, so a transient reading never sticks. */
const REMEMBER_AFTER_MS = 1500;
const MEMORY_KEY = "yarne.viewport.min.v1";
/** Bar sizes change with app updates, so an old measurement is not trusted forever. */
const MEMORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let locked: { w: number; h: number } | null = null;
let resetTimer = 0;
let rememberTimer = 0;

type Memory = Record<string, { h: number; at: number }>;

/** One slot per orientation and screen, since the bars take a different share of each. */
function memorySlot(): string {
  return `${window.innerWidth}x${Math.max(window.screen.width, window.screen.height)}`;
}

function readMemory(): Memory {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Memory) : {};
  } catch {
    return {};
  }
}

function recall(): number | null {
  const entry = readMemory()[memorySlot()];
  if (!entry || typeof entry.h !== "number" || Date.now() - entry.at > MEMORY_TTL_MS) return null;
  return entry.h;
}

function scheduleRemember(): void {
  window.clearTimeout(rememberTimer);
  rememberTimer = window.setTimeout(() => {
    if (!locked) return;
    try {
      const memory = readMemory();
      memory[memorySlot()] = { h: locked.h, at: Date.now() };
      window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch {
      // Storage can be blocked in a webview; the hold still works, it just cannot pre-empt a jump.
    }
  }, REMEMBER_AFTER_MS);
}

export function isInAppBrowser(): boolean {
  return typeof navigator !== "undefined" && IN_APP_UA.test(navigator.userAgent);
}

/** Viewport height for layout maths in JS: held steady in in-app browsers, live elsewhere. */
export function getStableViewportHeight(): number {
  return locked ? locked.h : window.innerHeight;
}

/** The on-screen keyboard shrinks the webview far more than any bar does; don't lock to that. */
function isTyping(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

function publish(): void {
  if (!locked) return;
  const root = document.documentElement;
  root.style.setProperty("--app-svh", `${locked.h}px`);
  // Landscape moves the chrome to the sides and top, so there is no strip to fill.
  const portrait = locked.h > locked.w;
  const screenLong = Math.max(window.screen.width, window.screen.height); // iOS reports portrait dims
  const strip = portrait ? Math.min(MAX_STRIP_PX, Math.max(0, screenLong - locked.h)) : 0;
  root.style.setProperty("--browser-bar-b", `${strip}px`);
  scheduleRemember();
}

function remeasure(): void {
  const h = window.innerHeight;
  // Opened while the bars were already out, h is the tall state. A shorter height remembered
  // from an earlier visit is the one they will bring back, so start from that. It only counts
  // if the gap is one a pair of bars could account for.
  const remembered = recall();
  const usable = remembered !== null && remembered < h && h - remembered <= MAX_BAR_TRAVEL_PX;
  locked = { w: window.innerWidth, h: usable ? remembered : h };
  publish();
}

function scheduleRemeasure(): void {
  window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(remeasure, ROTATION_SETTLE_MS);
}

function onResize(): void {
  if (!locked) return;
  if (Math.abs(window.innerWidth - locked.w) > 1) {
    scheduleRemeasure();
    return;
  }
  if (isTyping()) return;
  const drop = locked.h - window.innerHeight;
  if (drop > 0 && drop <= MAX_BAR_TRAVEL_PX) {
    locked.h = window.innerHeight;
    publish();
  }
}

export function installStableViewport(): void {
  if (typeof window === "undefined" || !isInAppBrowser()) return;
  remeasure();
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", scheduleRemeasure);
  window.visualViewport?.addEventListener("resize", onResize);
}
