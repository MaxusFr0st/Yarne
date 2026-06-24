import { Outlet, useLocation, useNavigationType } from "react-router";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header";
import { CartDrawer } from "../components/CartDrawer";
import { LoginModal } from "../components/LoginModal";
import { Footer } from "../components/Footer";
import { PageTransition } from "../components/PageTransition";
import { getLocaleFromPath } from "../i18n/useLocale";
import { consumePreservedScroll } from "../i18n/localeNavigation";

const SCROLL_STORAGE_KEY = "yarne.scroll.positions.v2";

type ScrollPositions = Record<string, number>;

function readScrollPositions(): ScrollPositions {
  if (typeof window === "undefined") return {};
  const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: ScrollPositions = {};
    for (const [key, value] of Object.entries(parsed)) {
      const num = Number(value);
      if (Number.isFinite(num) && num >= 0) normalized[key] = num;
    }
    return normalized;
  } catch {
    return {};
  }
}

function writeScrollPositions(positions: ScrollPositions): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions));
}

function routeStorageKey(pathname: string, search: string): string {
  return `route:${pathname}${search}`;
}

function entryStorageKey(key: string | undefined): string {
  return key ? `entry:${key}` : "";
}

export function Root() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef<ScrollPositions>(readScrollPositions());
  const prevLocationRef = useRef(location);
  const rafRef = useRef<number | null>(null);
  const restoreTimersRef = useRef<number[]>([]);
  const { i18n } = useTranslation();

  const routeKey = `${location.pathname}${location.search}`;
  const currentRouteKey = routeStorageKey(location.pathname, location.search);
  const currentEntryKey = entryStorageKey(location.key);

  // URL is the source of truth: keep i18next + <html lang> in sync with it.
  useEffect(() => {
    const fromPath = getLocaleFromPath(location.pathname);
    if (!fromPath) return;
    if (i18n.language !== fromPath) void i18n.changeLanguage(fromPath);
    if (typeof document !== "undefined") {
      document.documentElement.lang = fromPath;
    }
  }, [location.pathname, i18n]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const prev = prevLocationRef.current;
    const pathChanged =
      prev.pathname !== location.pathname ||
      prev.search !== location.search ||
      prev.key !== location.key;

    // Save leaving page scroll BEFORE any snap — useEffect cleanup runs too late (after snap to 0).
    if (pathChanged) {
      const y = Math.max(0, Math.round(window.scrollY));
      const prevRouteKey = routeStorageKey(prev.pathname, prev.search);
      const prevEntryKey = entryStorageKey(prev.key);
      const next = { ...positionsRef.current, [prevRouteKey]: y };
      if (prevEntryKey) next[prevEntryKey] = y;
      positionsRef.current = next;
      writeScrollPositions(next);
    }

    prevLocationRef.current = location;

    const snapScroll = (top: number) => {
      window.scrollTo(0, Math.max(0, Math.round(top)));
    };

    const clearRestoreTimers = () => {
      for (const id of restoreTimersRef.current) window.clearTimeout(id);
      restoreTimersRef.current = [];
    };

    const restoreWithRetries = (top: number) => {
      clearRestoreTimers();
      const y = Math.max(0, Math.round(top));
      const apply = () => snapScroll(y);
      apply();
      requestAnimationFrame(() => {
        requestAnimationFrame(apply);
      });
      // Retry after layout/async content (product grids) settle.
      restoreTimersRef.current = [50, 150, 350].map((ms) => window.setTimeout(apply, ms));
    };

    const restoreScroll = () => {
      if (location.hash) {
        const id = location.hash.slice(1);
        const target = id ? document.getElementById(id) : null;
        if (target) {
          target.scrollIntoView({ behavior: "auto", block: "start" });
          return;
        }
      }

      const preserved = consumePreservedScroll();
      if (preserved != null) {
        restoreWithRetries(preserved);
        return;
      }

      if (navigationType === "POP") {
        const positions = positionsRef.current;
        const nextTop =
          (currentEntryKey && Number.isFinite(positions[currentEntryKey]) ? positions[currentEntryKey] : undefined) ??
          (Number.isFinite(positions[currentRouteKey]) ? positions[currentRouteKey] : 0);
        restoreWithRetries(nextTop);
        return;
      }

      // PUSH / REPLACE — snap to top before paint.
      clearRestoreTimers();
      snapScroll(0);
    };

    restoreScroll();

    return () => clearRestoreTimers();
  }, [currentEntryKey, currentRouteKey, location.hash, location.key, location.pathname, location.search, navigationType]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistNow = () => {
      const y = Math.max(0, Math.round(window.scrollY));
      const next = { ...positionsRef.current, [currentRouteKey]: y };
      if (currentEntryKey) next[currentEntryKey] = y;
      positionsRef.current = next;
      writeScrollPositions(next);
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        persistNow();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      persistNow();
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [currentEntryKey, currentRouteKey]);

  return (
    <div className="relative" style={{ backgroundColor: "#F5F2ED", minHeight: "100svh" }}>
      <Header />
      <PageTransition>
        <Outlet />
      </PageTransition>
      <Footer />
      <CartDrawer />
      <LoginModal />
    </div>
  );
}
