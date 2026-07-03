import React from "react";
import {
  createBrowserRouter,
  Outlet,
  redirect,
  type LoaderFunctionArgs,
} from "react-router";
import { Root } from "./pages/Root";
import { Home } from "./pages/Home";
import { Collection } from "./pages/Collection";
import { ProductDetail } from "./pages/ProductDetail";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { NotFound } from "./pages/NotFound";
import { AdminGuard } from "./components/AdminGuard";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./i18n/config";
import { detectCountry, localeForCountry } from "./i18n/geo";

// Resolve preferred locale synchronously: stored choice > navigator language >
// default. Geo-IP refines the answer asynchronously after first paint
// (kicked off below alongside route initialisation).
function resolvePreferredLocaleSync(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // ignore — storage may be disabled
  }
  const nav = (
    typeof navigator !== "undefined" ? navigator.language : ""
  ).toLowerCase();
  if (nav.startsWith("uk")) return "uk";
  if (nav.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

// First-load geo refinement. If the visitor has no stored choice, ping the
// geo-IP service once and persist the result so the next route loader sees
// the refined locale immediately. Run as a side-effect at module load.
if (typeof window !== "undefined") {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!isLocale(stored)) {
      void detectCountry().then((country) => {
        const next = localeForCountry(country);
        try {
          // We persist the geo-derived locale so subsequent /-hits resolve
          // synchronously. The user can override anytime via the switcher.
          window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
        } catch {
          // ignore — storage disabled
        }
        // If the visitor is already on `/`, push them onto the resolved tree.
        const path = window.location.pathname;
        const firstSeg = path.split("/").filter(Boolean)[0];
        if (path === "/" || (firstSeg && !isLocale(firstSeg) && firstSeg !== "admin")) {
          const rest = path === "/" ? "" : path;
          window.location.replace(
            `/${next}${rest}${window.location.search}${window.location.hash}`
          );
        }
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Loader that redirects any path that isn't already locale-prefixed (or
 * admin) to `/<preferred-lang><rest>`. Runs at routing time — no flash of
 * empty content, no `<Navigate>` effect tick.
 */
function localeRedirectLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const firstSeg = url.pathname.split("/").filter(Boolean)[0];

  // Path already starts with a supported locale → render as-is (404 child
  // route inside `:lang` will catch unknown sub-paths).
  if (isLocale(firstSeg)) return null;

  const preferred = resolvePreferredLocaleSync();
  const rest = url.pathname === "/" ? "" : url.pathname;
  const target = `/${preferred}${rest}${url.search}${url.hash}`;
  return redirect(target);
}

/**
 * Loader for the `:lang` route. If the param isn't a supported locale, hand
 * off to the same redirect logic so `/foobar/baz` becomes `/<lang>/foobar/baz`
 * (and then renders NotFound under the valid locale).
 */
function langLoader(args: LoaderFunctionArgs) {
  const { params } = args;
  if (isLocale(params.lang)) return null;
  return localeRedirectLoader(args);
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      // Locale-prefixed storefront tree.
      {
        path: ":lang",
        loader: langLoader,
        element: <Outlet />,
        children: [
          { index: true, Component: Home },
          { path: "collection", Component: Collection },
          { path: "product/:id", Component: ProductDetail },
          { path: "checkout", Component: CheckoutPage },
          { path: "account", Component: AccountPage },
          // /en/admin → canonical /admin (admin has no locale prefix).
          { path: "admin", loader: () => redirect("/admin") },
          // Unknown path under a valid locale → 404 (don't redirect-loop).
          { path: "*", Component: NotFound },
        ],
      },
      // Admin stays unprefixed (English-only operator UI).
      {
        path: "admin",
        element: (
          <AdminGuard>
            <AdminPage />
          </AdminGuard>
        ),
      },
      // Bare root → redirect into preferred locale (loader runs synchronously).
      { index: true, loader: localeRedirectLoader, element: null },
      // Anything else (typed paths, old links) → also redirect at loader time.
      { path: "*", loader: localeRedirectLoader, element: null },
    ],
  },
]);
