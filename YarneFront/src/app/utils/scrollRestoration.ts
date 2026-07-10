const STORAGE_KEY = "yarne.scroll.positions.v2";
const RETURN_SCROLL_KEY = "yarne.scroll.return.v1";

export type ScrollPositions = Record<string, number>;

type ReturnScrollMarker = {
  route: string;
  entry: string;
  y: number;
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function routeStorageKey(pathname: string, search: string): string {
  return `route:${normalizePath(pathname)}${search}`;
}

export function entryStorageKey(key: string | undefined): string {
  return key ? `entry:${key}` : "";
}

export function readScrollPositions(): ScrollPositions {
  if (typeof window === "undefined") return {};
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: ScrollPositions = {};
    for (const [k, value] of Object.entries(parsed)) {
      const num = Number(value);
      if (Number.isFinite(num) && num >= 0) normalized[k] = num;
    }
    return normalized;
  } catch {
    return {};
  }
}

export function writeScrollPositions(positions: ScrollPositions): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export function clearScrollForRoute(pathname: string, search: string): void {
  if (typeof window === "undefined") return;
  const positions = readScrollPositions();
  const routeKey = routeStorageKey(pathname, search);
  if (!(routeKey in positions)) return;
  const next = { ...positions };
  delete next[routeKey];
  writeScrollPositions(next);
}

export function clearAllScrollPositions(): void {
  if (typeof window === "undefined") return;
  writeScrollPositions({});
  window.sessionStorage.removeItem(RETURN_SCROLL_KEY);
}

/** Only list-style pages restore scroll on browser back; detail pages always open at top. */
export function isProductDetailPath(barePath: string): boolean {
  return /^\/product\/[^/]+/.test(barePath);
}

export function shouldRestoreScrollOnPop(barePath: string): boolean {
  if (isProductDetailPath(barePath)) return false;
  if (barePath === "/" || barePath === "") return true;
  return barePath === "/collection" || barePath.startsWith("/collection/");
}

export function saveScrollPosition(
  positions: ScrollPositions,
  pathname: string,
  search: string,
  historyKey: string | undefined,
  y: number,
): ScrollPositions {
  const top = Math.max(0, Math.round(y));
  const routeKey = routeStorageKey(pathname, search);
  const entryKey = entryStorageKey(historyKey);
  const next = { ...positions, [routeKey]: top };
  if (entryKey) next[entryKey] = top;
  writeScrollPositions(next);
  return next;
}

/** Call at click time — before the router changes route or scroll snaps to 0. */
export function captureScrollPosition(
  positions: ScrollPositions,
  pathname: string,
  search: string,
  historyKey: string | undefined,
): ScrollPositions {
  if (typeof window === "undefined") return positions;
  const y = Math.max(0, Math.round(window.scrollY));
  const routeKey = routeStorageKey(pathname, search);
  const existing = positions[routeKey] ?? 0;
  const top = y === 0 && existing > 48 ? existing : y;
  return saveScrollPosition(positions, pathname, search, historyKey, top);
}

/** Remember where to land when the user pops back to this history entry. */
export function markReturnScroll(
  pathname: string,
  search: string,
  historyKey: string | undefined,
): void {
  if (typeof window === "undefined") return;
  const y = Math.max(0, Math.round(window.scrollY));
  if (y <= 0) return;
  const marker: ReturnScrollMarker = {
    route: routeStorageKey(pathname, search),
    entry: entryStorageKey(historyKey),
    y,
  };
  window.sessionStorage.setItem(RETURN_SCROLL_KEY, JSON.stringify(marker));
}

export function consumeReturnScroll(
  pathname: string,
  search: string,
  historyKey: string | undefined,
): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(RETURN_SCROLL_KEY);
  if (!raw) return null;
  try {
    const marker = JSON.parse(raw) as ReturnScrollMarker;
    const route = routeStorageKey(pathname, search);
    const entry = entryStorageKey(historyKey);
    const matches = marker.route === route || (entry.length > 0 && marker.entry === entry);
    if (!matches || !Number.isFinite(marker.y) || marker.y < 0) return null;
    window.sessionStorage.removeItem(RETURN_SCROLL_KEY);
    return Math.round(marker.y);
  } catch {
    return null;
  }
}

export function persistScrollPosition(
  positions: ScrollPositions,
  pathname: string,
  search: string,
  historyKey: string | undefined,
): ScrollPositions {
  if (typeof window === "undefined") return positions;
  const y = Math.max(0, Math.round(window.scrollY));
  const routeKey = routeStorageKey(pathname, search);
  const existing = positions[routeKey] ?? 0;
  // Never clobber a deep-scroll snapshot with 0 (happens after route snap on leave).
  if (y === 0 && existing > 48) return positions;
  return saveScrollPosition(positions, pathname, search, historyKey, y);
}

export function resolveScrollPosition(
  positions: ScrollPositions,
  pathname: string,
  search: string,
  historyKey: string | undefined,
): number {
  const entryKey = entryStorageKey(historyKey);
  const routeKey = routeStorageKey(pathname, search);
  if (entryKey && Number.isFinite(positions[entryKey])) return positions[entryKey];
  if (Number.isFinite(positions[routeKey])) return positions[routeKey];
  return 0;
}

const RESTORE_DELAYS_MS = [0, 16, 50, 100, 200, 400, 800, 1200, 2000];

export function restoreScrollPosition(
  top: number,
  onCleanup?: (cleanup: () => void) => void,
): void {
  if (typeof window === "undefined") return;

  const target = Math.max(0, Math.round(top));
  const snap = () => window.scrollTo(0, target);

  if (target === 0) {
    snap();
    return;
  }

  const canReach = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return maxScroll >= target - 8;
  };

  const apply = () => {
    if (!canReach()) return false;
    snap();
    return Math.abs(window.scrollY - target) <= 8;
  };

  let observer: ResizeObserver | null = null;
  const timers: number[] = [];

  const cleanup = () => {
    observer?.disconnect();
    observer = null;
    for (const id of timers) window.clearTimeout(id);
    timers.length = 0;
  };

  apply();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (apply()) cleanup();
    });
  });

  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => {
      if (apply()) cleanup();
    });
    observer.observe(document.documentElement);
  }

  for (const ms of RESTORE_DELAYS_MS) {
    timers.push(
      window.setTimeout(() => {
        if (apply()) cleanup();
      }, ms),
    );
  }

  timers.push(window.setTimeout(cleanup, 2500));
  onCleanup?.(cleanup);
}
