/**
 * Keeps full-height sections one fixed size on phones, whatever the browser chrome is doing.
 *
 * Real browsers are easy: Safari's and Chrome's collapsing URL bars leave 100svh alone and only
 * move lvh/dvh/innerHeight. In-app browsers (Instagram, Facebook, the Google app, TikTok,
 * Telegram...) are not: the webview is not the whole screen, the app's own bars sit above and
 * below it and slide away as the page scrolls, and every time they do the webview itself is
 * resized. A resized webview has no separate "small" and "large" viewport - 100svh, 100lvh,
 * 100dvh and window.innerHeight all follow the bars. Every section sized from them then re-lays
 * out on each scroll nudge: content anchored to a section's bottom slides, images re-crop and
 * the whole page jumps.
 *
 * The rest of the site avoids the problem the standard way: nothing in the page flow is sized
 * from the viewport's height on phones (widths, aspect-ratios and content instead). The one
 * exception is the pinned "Why" section, whose sticky frame has to be exactly one screen tall,
 * plus one-shot JS measurements (getStableViewportHeight). For those, on every touch device the
 * height is measured once and held in --app-svh (a plain pixel value). Don't use it for new
 * layout. In a real browser the held value is exactly 100svh, so nothing changes there. The held
 * value only ever shrinks (the layout never ends up taller than what the visitor can see when
 * the bars are out) and starts over when the width changes, i.e. on rotation.
 *
 * Webview mode is entered on any of: a known in-app user agent; a phone whose svh equals its lvh
 * (a webview has no small/large distinction; real mobile browsers with a URL bar do); or, as a
 * catch-all for apps nobody has listed yet, svh itself changing height at the same width, which
 * only happens when the whole viewport is being resized under the page. The last one is
 * remembered per device, so only the very first visit from such an app can adjust once.
 *
 * In webview mode --browser-bar-b, the strip full-height sections add below their content so
 * the room the bars hand back shows the section's own background rather than the next section,
 * becomes the gap between the held height and the screen. Together each full-height section is
 * a constant screen tall whichever bars are showing. Outside webview mode the strip is left to
 * theme.css / browserBarInset.ts.
 *
 * Desktop (fine pointer) is left alone: there a height change is a real window resize.
 */
const IN_APP_UA =
  /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|Barcelona|Threads|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|LinkedInApp|\bLine\/|GSA\/|Twitter|Telegram|Viber|WhatsApp|MicroMessenger|KAKAOTALK|; wv\)/i;

/** The most a pair of app bars can take off the viewport; a bigger drop is a keyboard or a resized window. */
const MAX_BAR_TRAVEL_PX = 220;
/** Same ceiling browserBarInset.ts uses for the strip. */
const MAX_STRIP_PX = 240;
/** Rotation reports width and height at different moments; wait for both to settle. */
const ROTATION_SETTLE_MS = 300;
/** A height is only remembered once it has held this long, so a transient reading never sticks. */
const REMEMBER_AFTER_MS = 1500;
const MEMORY_KEY = "yarne.viewport.min.v2";
/** Bar sizes change with app updates, so an old measurement is not trusted forever. */
const MEMORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Widest viewport treated as a phone for the svh == lvh webview heuristic. */
const PHONE_MAX_W = 767;

let locked: { w: number; h: number } | null = null;
let webview = false;
let resetTimer = 0;
let rememberTimer = 0;
const listeners = new Set<() => void>();

type Memory = Record<string, { h: number; at: number; wv?: boolean }>;

/**
 * One slot per orientation and screen, since the bars take a different share of each. The
 * user-agent length keeps an app's webview and a browser apart in the rare case they share
 * storage, so a webview verdict never leaks into a real browser.
 */
function memorySlot(): string {
  return `${window.innerWidth}x${Math.max(window.screen.width, window.screen.height)}|${navigator.userAgent.length}`;
}

function readMemory(): Memory {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Memory) : {};
  } catch {
    return {};
  }
}

function recall(): Memory[string] | null {
  const entry = readMemory()[memorySlot()];
  if (!entry || typeof entry.h !== "number" || Date.now() - entry.at > MEMORY_TTL_MS) return null;
  return entry;
}

function scheduleRemember(): void {
  window.clearTimeout(rememberTimer);
  rememberTimer = window.setTimeout(() => {
    if (!locked) return;
    try {
      const memory = readMemory();
      memory[memorySlot()] = { h: locked.h, at: Date.now(), wv: webview };
      window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch {
      // Storage can be blocked in a webview; the hold still works, it just cannot pre-empt a jump.
    }
  }, REMEMBER_AFTER_MS);
}

/** Pixel height of a CSS length, e.g. "100svh". */
function probe(height: string): number {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;top:0;left:0;width:0;height:${height};visibility:hidden;pointer-events:none`;
  document.documentElement.appendChild(el);
  const px = el.offsetHeight;
  el.remove();
  return px;
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Every real iOS browser (Safari, Chrome, Firefox, Edge...) keeps the "Safari/" token; a bare
  // WKWebView embedded in some app does not.
  return IN_APP_UA.test(ua) || (/iPhone|iPod/.test(ua) && !/Safari\//.test(ua));
}

/** Whether the page sits in a webview that resizes with its host app's bars. */
export function isWebviewMode(): boolean {
  return webview;
}

/** Whether --app-svh is currently held at a fixed pixel value. */
export function isViewportLocked(): boolean {
  return locked !== null;
}

/** Viewport height for layout maths in JS: held steady on touch devices, live elsewhere. */
export function getStableViewportHeight(): number {
  return locked ? locked.h : window.innerHeight;
}

/** Called whenever the held height changes (a rare, one-off event, or rotation). */
export function onStableViewportChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The on-screen keyboard shrinks the webview far more than any bar does; don't lock to that. */
function isTyping(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Current height the layout should be built from, before holding. */
function currentHeight(): number {
  // In a webview svh and innerHeight are the same number; innerHeight is cheaper and is what the
  // resize event reports. In a real browser svh is the stable small viewport.
  return webview ? window.innerHeight : probe("100svh");
}

function publish(): void {
  if (!locked) return;
  const root = document.documentElement;
  root.style.setProperty("--app-svh", `${locked.h}px`);
  if (webview) {
    // Landscape moves the chrome to the sides and top, so there is no strip to fill.
    const portrait = locked.h > locked.w;
    const screenLong = Math.max(window.screen.width, window.screen.height); // iOS reports portrait dims
    const strip = portrait ? Math.min(MAX_STRIP_PX, Math.max(0, screenLong - locked.h)) : 0;
    root.style.setProperty("--browser-bar-b", `${strip}px`);
  }
  scheduleRemember();
  listeners.forEach((cb) => cb());
}

function remeasure(): void {
  const memory = recall();
  if (memory?.wv) webview = true;
  if (!webview && window.innerWidth <= PHONE_MAX_W && !isStandalone() && probe("100svh") === probe("100lvh")) {
    webview = true;
  }
  const h = currentHeight();
  // Opened while the bars were already out, h is the tall state. A shorter height remembered
  // from an earlier visit is the one they will bring back, so start from that. It only counts
  // if the gap is one a pair of bars could account for.
  const remembered = memory?.h ?? null;
  const usable = webview && remembered !== null && remembered < h && h - remembered <= MAX_BAR_TRAVEL_PX;
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

  if (!webview) {
    // A real browser's svh never moves at a fixed width. If it just did, the whole viewport is
    // being resized under the page: this is a webview nobody listed. Switch to holding it.
    const svh = probe("100svh");
    const delta = Math.abs(svh - locked.h);
    if (delta <= 1 || delta > MAX_BAR_TRAVEL_PX) return;
    webview = true;
    locked.h = Math.min(locked.h, window.innerHeight);
    publish();
    return;
  }

  const drop = locked.h - window.innerHeight;
  if (drop > 0 && drop <= MAX_BAR_TRAVEL_PX) {
    locked.h = window.innerHeight;
    publish();
  }
}

export function installStableViewport(): void {
  if (typeof window === "undefined") return;
  webview = isInAppBrowser();
  if (!webview && !window.matchMedia("(pointer: coarse)").matches) return; // desktop: live units
  remeasure();
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", scheduleRemeasure);
  window.visualViewport?.addEventListener("resize", onResize);
}
