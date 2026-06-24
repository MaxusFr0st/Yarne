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
import {
  captureScrollPosition,
  consumeReturnScroll,
  entryStorageKey,
  markReturnScroll,
  persistScrollPosition,
  readScrollPositions,
  resolveScrollPosition,
  restoreScrollPosition,
  routeStorageKey,
  type ScrollPositions,
} from "../utils/scrollRestoration";

export function Root() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef<ScrollPositions>(readScrollPositions());
  const prevLocationRef = useRef(location);
  const rafRef = useRef<number | null>(null);
  const restoreCleanupRef = useRef<(() => void) | null>(null);
  const { i18n } = useTranslation();

  const currentRouteKey = routeStorageKey(location.pathname, location.search);
  const currentEntryKey = entryStorageKey(location.key);

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

  // Capture scroll at click — runs before route change / snap-to-top.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || /^[a-z][a-z0-9+\-.]*:/i.test(href)) return;

      positionsRef.current = captureScrollPosition(
        positionsRef.current,
        location.pathname,
        location.search,
        location.key,
      );
      markReturnScroll(location.pathname, location.search, location.key);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [location.key, location.pathname, location.search]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    restoreCleanupRef.current?.();
    restoreCleanupRef.current = null;

    const prev = prevLocationRef.current;
    const pathChanged =
      prev.pathname !== location.pathname ||
      prev.search !== location.search ||
      prev.key !== location.key;

    if (pathChanged) {
      positionsRef.current = captureScrollPosition(
        positionsRef.current,
        prev.pathname,
        prev.search,
        prev.key,
      );
    }

    prevLocationRef.current = location;

    const snapScroll = (top: number) => {
      window.scrollTo(0, Math.max(0, Math.round(top)));
    };

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
      restoreScrollPosition(preserved, (cleanup) => {
        restoreCleanupRef.current = cleanup;
      });
      return;
    }

    if (navigationType === "POP") {
      positionsRef.current = readScrollPositions();
      const returnY = consumeReturnScroll(location.pathname, location.search, location.key);
      const nextTop =
        returnY ??
        resolveScrollPosition(
          positionsRef.current,
          location.pathname,
          location.search,
          location.key,
        );
      restoreScrollPosition(nextTop, (cleanup) => {
        restoreCleanupRef.current = cleanup;
      });
      return;
    }

    snapScroll(0);

    return () => {
      restoreCleanupRef.current?.();
      restoreCleanupRef.current = null;
    };
  }, [currentEntryKey, currentRouteKey, location.hash, location.key, location.pathname, location.search, navigationType]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistNow = () => {
      positionsRef.current = persistScrollPosition(
        positionsRef.current,
        location.pathname,
        location.search,
        location.key,
      );
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
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [currentEntryKey, currentRouteKey, location.key, location.pathname, location.search]);

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
