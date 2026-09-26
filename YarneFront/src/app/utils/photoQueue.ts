import { resolveMediaUrl } from "./storefrontMedia";

/**
 * One background download queue for photos the visitor is likely to open next, so they are
 * already on the phone when needed. The photos on screen are not queued: the page loads those
 * itself, first.
 *
 * - A priority list, not a line: a lower `Priority` always goes first, and asking for a photo
 *   again with a more urgent priority moves it up, even if it was queued last.
 * - At most 2 downloads at a time, so a photo the visitor asks for directly starts at once beside
 *   them instead of queueing behind a whole catalogue.
 * - Paused while a newly opened page loads the photos on its screen (`settlePage`).
 * - Off entirely when the device asks to save data.
 * - A photo is downloaded once per visit; after that the browser's cache has it (a year).
 */
export const Priority = {
  /** On the product page the visitor is looking at: that product's other colours and sizes. */
  now: 0,
  /** One tap away: products on screen, and the rest of the current page. */
  oneTap: 1,
  /** One scroll away: products just below the screen. */
  oneScroll: 2,
  /** First screens of other pages: every product's default photo, the home page's photos. */
  otherPages: 3,
  /** Desktop only: every photo of every product. */
  everything: 4,
} as const;

type Task = { url: string; priority: number; order: number; owner?: string };

const MAX_PARALLEL = 2;
/** A page whose photos never finish loading must not hold the queue forever. */
const SETTLE_MAX_MS = 4000;
const SETTLE_CHECK_MS = 250;

const queued = new Map<string, Task>();
const started = new Set<string>();
let running = 0;
let order = 0;
let paused = true;
let settleToken = 0;

function saveData(): boolean {
  return Boolean((navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData);
}

/** A mouse or trackpad and a wide screen: usually on Wi-Fi, so it can take every photo. */
export function isDesktop(): boolean {
  return window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches;
}

function pump(): void {
  while (!paused && running < MAX_PARALLEL && queued.size > 0) {
    let next: Task | undefined;
    for (const task of queued.values()) {
      if (!next || task.priority < next.priority || (task.priority === next.priority && task.order < next.order)) {
        next = task;
      }
    }
    if (!next) return;
    queued.delete(next.url);
    started.add(next.url);
    running += 1;
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => {
      running -= 1;
      pump();
    };
    img.src = next.url;
  }
}

/**
 * Queue photos (raw `src` values as stored; empty ones are skipped). `owner` lets a page drop
 * what it queued when the visitor leaves it (`dropPhotos`).
 */
export function queuePhotos(srcs: Iterable<string | undefined | null>, priority: number, owner?: string): void {
  if (typeof window === "undefined" || saveData()) return;
  for (const src of srcs) {
    const url = resolveMediaUrl(src);
    if (!url || url.startsWith("data:") || started.has(url)) continue;
    const existing = queued.get(url);
    if (existing) {
      if (priority < existing.priority) {
        existing.priority = priority;
        existing.owner = owner;
      }
      continue;
    }
    queued.set(url, { url, priority, order: order++, owner });
  }
  pump();
}

/** Forget what `owner` queued and has not started yet. */
export function dropPhotos(owner: string): void {
  for (const [url, task] of queued) {
    if (task.owner === owner) queued.delete(url);
  }
}

function visiblePhotosLoading(): boolean {
  for (const img of Array.from(document.images)) {
    if (img.complete || !img.getAttribute("src")) continue;
    const r = img.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) return true;
  }
  return false;
}

/**
 * Hold the queue while the page just opened loads the photos on its screen, then carry on.
 * Called on every page change, and once at start.
 */
export function settlePage(): void {
  if (typeof window === "undefined") return;
  paused = true;
  const token = ++settleToken;
  const startedAt = Date.now();
  let calmChecks = 0;
  const check = () => {
    if (token !== settleToken) return;
    const calm = document.readyState === "complete" && !visiblePhotosLoading();
    calmChecks = calm ? calmChecks + 1 : 0;
    // Two calm checks in a row: a page that renders its photos a moment after the route
    // changes would otherwise look calm before its first photo has even been asked for.
    if (calmChecks >= 2 || Date.now() - startedAt > SETTLE_MAX_MS) {
      paused = false;
      pump();
    } else {
      window.setTimeout(check, SETTLE_CHECK_MS);
    }
  };
  window.setTimeout(check, SETTLE_CHECK_MS);
}
