/**
 * Asks the server for what the opened page shows first, before the app's code has arrived.
 *
 * index.html loads this as its own tiny file, next to the app. Without it, nothing could be
 * asked for until the whole app had downloaded and started, and only then would the page ask
 * for its content and, after that, its first photos: three waits in a row. Here the answer and
 * the first photos download in parallel with the code, and the app picks the answers up through
 * app/api/earlyRequests.ts instead of asking again.
 *
 * Nothing here is required: if a request fails, or a URL is built differently from the app's,
 * the app just asks the server itself. So this file imports nothing (keeping it tiny and free of
 * shared chunks) and duplicates the few rules it needs from the app, noted where they come from.
 */
import type { EarlyEntry, EarlyRequests } from "./app/api/earlyRequests";

type ProductImage = { src?: string };
type Color = { name?: string; image?: ProductImage };
type Product = { defaultColor?: string | null; colors?: Color[] };

// A classic script (see vite.config.ts): everything lives inside this function, so nothing leaks
// into the page's globals.
(function () {
  /** Cards on the first screen of the collection page: one row on desktop, two on phones. */
  const FIRST_CARDS = 4;

  try {
    const api = apiBase();
    if (!api) return;
    const early: EarlyRequests = (window.__YARNE_EARLY__ = {});

    const get = (endpoint: string): Promise<unknown> => {
      const url = apiUrl(api, endpoint);
      // Same credentials as app/api/client.ts, so the answer is the one the app would get.
      const promise = fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      });
      const entry: EarlyEntry = { promise, askedAt: Date.now() };
      promise.then((value) => (entry.value = value), () => undefined);
      early[url] = entry;
      return promise;
    };

    const photo = (src: string | undefined) => {
      const url = mediaUrl(api, src);
      if (!url) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = url;
      link.setAttribute("fetchpriority", "high");
      document.head.appendChild(link);
    };

    const [, lang, page, id] = location.pathname.match(/^\/(uk|en)?\/?(collection|product)?\/?([^/]*)/) ?? [];
    const query = new URLSearchParams(location.search);

    if (!page && !id) {
      // Home (or the bare root, which redirects to it): the hero's heading and photo.
      // Keys from app/utils/homePageCopy.ts and homePageMediaSelection.ts.
      get("/api/storefront-settings/yarne.home.copy.v1").catch(() => undefined);
      get("/api/storefront-settings/yarne.home.media.v1").then(
        (res) => photo(((res as { value?: { heroImageUrl?: string } }).value ?? {}).heroImageUrl),
        () => undefined,
      );
    } else if (lang && page === "collection" && !id) {
      // Same query as app/pages/Collection.tsx and app/api/products.ts fetchProducts.
      const params = new URLSearchParams();
      const collectionId = Number.parseInt(query.get("collection") ?? "", 10);
      if (collectionId) params.set("collectionId", String(collectionId));
      else if (query.get("filter") === "new") params.set("isNew", "true");
      const qs = params.toString();
      get(`/api/products${qs ? `?${qs}` : ""}`).then(
        (list) => (list as Product[]).slice(0, FIRST_CARDS).forEach((p) => photo(defaultColor(p)?.image?.src)),
        () => undefined,
      );
    } else if (lang && page === "product" && id) {
      // The product page's first photo is its colour's card photo (app/pages/ProductDetail.tsx,
      // app/utils/productColorIndex.ts): the ?color= the shopper picked on the card, else the default.
      get(`/api/products/${encodeURIComponent(decodeURIComponent(id))}`).then((res) => {
        const product = res as Product;
        const picked = product.colors?.find((c) => c.name === query.get("color"));
        photo((picked ?? defaultColor(product))?.image?.src);
      }, () => undefined);
    }
  } catch {
    // The app asks for everything itself anyway.
  }

  /** app/utils/productColorIndex.ts getDefaultColorIndex. */
  function defaultColor(product: Product): Color | undefined {
    const colors = product.colors ?? [];
    return colors.find((c) => c.name === product.defaultColor) ?? colors[0];
  }

  /**
   * app/api/base.ts resolveApiBase, for deployed builds only: they set the API in config.js.
   * A local dev server talks to localhost:8080. Anything else is left to the app.
   */
  function apiBase(): string {
    const configured = (window.__YARNE_CONFIG__?.apiUrl ?? "").trim().replace(/^["']|["']$/g, "");
    if (configured) {
      const withScheme = /^https?:\/\//i.test(configured)
        ? configured
        : configured.startsWith("//")
          ? `https:${configured}`
          : `https://${configured}`;
      return withScheme.replace(/\/+$/, "");
    }
    return /^(localhost|127\.0\.0\.1)$/i.test(location.hostname) ? "http://localhost:8080" : "";
  }

  /** app/api/base.ts buildApiUrl. */
  function apiUrl(base: string, path: string): string {
    return base.toLowerCase().endsWith("/api") && path.toLowerCase().startsWith("/api/")
      ? base + path.slice(4)
      : base + path;
  }

  /** app/utils/storefrontMedia.ts resolveMediaUrl: /uploads/... photos are served by the API. */
  function mediaUrl(base: string, src: string | undefined): string {
    const trimmed = (src ?? "").trim();
    if (!trimmed || trimmed.startsWith("data:")) return "";
    const path = /^https?:\/\//i.test(trimmed) ? new URL(trimmed).pathname : trimmed;
    return path.startsWith("/uploads/") ? apiUrl(base, path) : trimmed;
  }
})();
