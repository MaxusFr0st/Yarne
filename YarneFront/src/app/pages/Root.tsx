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

export function Root() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef<ScrollPositions>(readScrollPositions());
  const rafRef = useRef<number | null>(null);
  const { i18n } = useTranslation();

  const routeKey = `${location.pathname}${location.search}`;
  const routeStorageKey = `route:${routeKey}`;
  const entryStorageKey = location.key ? `entry:${location.key}` : "";

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

    const snapScroll = (top: number) => {
      const y = Math.max(0, Math.round(top));
      // Legacy form + auto — never smooth-scroll on route changes (html scroll-behavior stays auto).
      window.scrollTo(0, y);
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
        snapScroll(preserved);
        return;
      }

      if (navigationType === "POP") {
        const positions = positionsRef.current;
        const nextTop =
          (entryStorageKey && Number.isFinite(positions[entryStorageKey]) ? positions[entryStorageKey] : undefined) ??
          (Number.isFinite(positions[routeStorageKey]) ? positions[routeStorageKey] : 0);
        snapScroll(nextTop);
        return;
      }

      // PUSH / REPLACE — snap to top before paint so the new page never flashes mid-scroll.
      snapScroll(0);
    };

    restoreScroll();
  }, [entryStorageKey, location.hash, navigationType, routeStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistNow = () => {
      const y = Math.max(0, Math.round(window.scrollY));
      const next = { ...positionsRef.current, [routeStorageKey]: y };
      if (entryStorageKey) next[entryStorageKey] = y;
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
  }, [entryStorageKey, routeStorageKey]);

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
