import { Outlet, useLocation, useNavigationType } from "react-router";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Header } from "../components/Header";
import { CartDrawer } from "../components/CartDrawer";
import { LoginModal } from "../components/LoginModal";
import { Footer } from "../components/Footer";

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

  const routeKey = `${location.pathname}${location.search}`;
  const routeStorageKey = `route:${routeKey}`;
  const entryStorageKey = location.key ? `entry:${location.key}` : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const restoreScroll = () => {
      if (location.hash) {
        const id = location.hash.slice(1);
        const target = id ? document.getElementById(id) : null;
        if (target) {
          target.scrollIntoView();
          return;
        }
      }

      const positions = positionsRef.current;
      let nextTop = 0;

      if (navigationType === "POP") {
        nextTop =
          (entryStorageKey && Number.isFinite(positions[entryStorageKey]) ? positions[entryStorageKey] : undefined) ??
          (Number.isFinite(positions[routeStorageKey]) ? positions[routeStorageKey] : 0);
      }

      window.scrollTo({ top: Math.max(0, Math.round(nextTop)), left: 0, behavior: "auto" });
    };

    // Wait until layout settles to avoid restoring too early.
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restoreScroll);
    });

    return () => window.cancelAnimationFrame(firstFrame);
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
    <div className="relative" style={{ backgroundColor: "#F5F2ED", minHeight: "100vh" }}>
      <Header />
      <Outlet />
      <Footer />
      <CartDrawer />
      <LoginModal />
    </div>
  );
}
