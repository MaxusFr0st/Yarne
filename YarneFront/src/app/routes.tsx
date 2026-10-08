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
import { AdminGuard } from "./components/AdminGuard";
import { RouteError } from "./pages/RouteError";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./i18n/config";

// Resolve preferred locale: stored choice → Ukrainian absolute default.
function resolvePreferredLocaleSync(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // ignore — storage may be disabled
  }
  return DEFAULT_LOCALE;
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

// Home, collection and product pages ship in the main file: they are where visitors land and
// move between, and splitting them saved only ~3% for a second round trip on a direct visit.
// Every other page is its own file, loaded when opened (the admin panel alone was a third of the
// main file). While one loads, the page the visitor is on stays on screen.
async function staticPage(pageKey: "delivery" | "terms") {
  const { StaticContentPage } = await import("./pages/StaticContentPage");
  return { element: <StaticContentPage pageKey={pageKey} /> };
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    // In the main file on purpose: it has to render when a page's own file could not be loaded.
    errorElement: <RouteError />,
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
          { path: "checkout", lazy: async () => ({ Component: (await import("./pages/CheckoutPage")).CheckoutPage }) },
          { path: "account", lazy: async () => ({ Component: (await import("./pages/AccountPage")).AccountPage }) },
          { path: "pages/our-history", lazy: async () => ({ Component: (await import("./pages/OurHistoryPage")).OurHistoryPage }) },
          { path: "pages/delivery", lazy: () => staticPage("delivery") },
          { path: "pages/care", lazy: async () => ({ Component: (await import("./pages/CarePage")).CarePage }) },
          // Before the material route: these two are pages of their own (CARE_RESERVED_SLUGS).
          { path: "pages/care/guarantee", lazy: async () => ({ Component: (await import("./pages/CareGuaranteePage")).CareGuaranteePage }) },
          { path: "pages/care/request", lazy: async () => ({ Component: (await import("./pages/CareRequestPage")).CareRequestPage }) },
          { path: "pages/care/:materialSlug", lazy: async () => ({ Component: (await import("./pages/CareMaterialPage")).CareMaterialPage }) },
          { path: "pages/terms", lazy: () => staticPage("terms") },
          // A customer's own order, opened with the token in the emails: unlisted (scripts/server.mjs marks it noindex).
          { path: "order/:token", lazy: async () => ({ Component: (await import("./pages/OrderStatusPage")).OrderStatusPage }) },
          // /en/admin → canonical /admin (admin has no locale prefix).
          { path: "admin", loader: () => redirect("/admin") },
          // Unknown path under a valid locale → 404 (don't redirect-loop).
          { path: "*", lazy: async () => ({ Component: (await import("./pages/NotFound")).NotFound }) },
        ],
      },
      // Admin stays unprefixed (English-only operator UI).
      {
        path: "admin",
        lazy: async () => {
          const { AdminPage } = await import("./pages/AdminPage");
          return {
            element: (
              <AdminGuard>
                <AdminPage />
              </AdminGuard>
            ),
          };
        },
      },
      // Bare root → redirect into preferred locale (loader runs synchronously).
      { index: true, loader: localeRedirectLoader, element: null },
      // Anything else (typed paths, old links) → also redirect at loader time.
      { path: "*", loader: localeRedirectLoader, element: null },
    ],
  },
]);

const RELOADED_FOR_DEPLOY_KEY = "yarne.reloadedForDeploy";

// After a deploy, a tab still running the old version asks for page files that no longer exist.
// Open the page the visitor was going to as a full load instead, which picks up the new version.
// Once only: if that just happened and a file still fails, let the error show.
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(window.sessionStorage.getItem(RELOADED_FOR_DEPLOY_KEY) ?? 0);
    if (Date.now() - last < 10_000) return;
    window.sessionStorage.setItem(RELOADED_FOR_DEPLOY_KEY, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  const next = router.state.navigation.location;
  window.location.assign(next ? next.pathname + next.search + next.hash : window.location.href);
});
