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
import { StaticContentPage } from "./pages/StaticContentPage";
import { NotFound } from "./pages/NotFound";
import { AdminGuard } from "./components/AdminGuard";
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
          { path: "pages/our-history", element: <StaticContentPage pageKey="ourHistory" /> },
          { path: "pages/delivery", element: <StaticContentPage pageKey="delivery" /> },
          { path: "pages/care", element: <StaticContentPage pageKey="care" /> },
          { path: "pages/terms", element: <StaticContentPage pageKey="terms" /> },
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
