# Photo and page loading - context, audit and optimisation plan

Written 2026-09-19. Continues `docs/cloudflare-migration-plan.md`. Audit run against the live
site (https://yarne-acc.com/uk) with Lighthouse 12, mobile profile (simulated slow 4G).

## 1. Where things stand (context)

- Product photos were moved from the Railway volume to Cloudflare R2 and are served from
  `https://media.yarne-acc.com` (custom domain on the bucket). 102 catalog photos + 9 order-only
  photos migrated; DB rows repointed; zero `/uploads/` references remain.
- New uploads go straight to R2 with `Cache-Control: public, max-age=31536000, immutable`.
- A Cloudflare Cache Rule (hostname media.yarne-acc.com, Edge TTL + Browser TTL = 1 year) makes the
  109 older objects cacheable too. Verified: a GET returns `cf-cache-status: HIT` and
  `Cache-Control: max-age=31536000`. Note `curl -I` (HEAD) reports DYNAMIC - always test with GET:
  `curl -s -D - -o /dev/null <url>`.
- Photo filenames are random GUIDs and never reused, so a 1-year cache is safe: editing a photo
  creates a new name, hence a new address.

## 2. How a page load works today

1. Browser asks Cloudflare for `yarne-acc.com/uk`. Cloudflare does not cache the HTML
   (cf-cache-status DYNAMIC), so it forwards to the frontend on Railway (single region).
   Root document: about 130 ms.
2. HTML is a tiny shell (`<div id="root">`). It lists: one CSS file, `config.js`, and one JS bundle.
3. CSS (25 KB) and `config.js` block rendering. The CSS starts with `@import` of Google Fonts, so
   the browser must fetch CSS -> then fonts CSS from fonts.googleapis.com -> then font files.
   7 requests, 213 KB, all before first paint.
4. The JS bundle is ONE file: 1.26 MB raw / 341 KB brotli. It contains every page, including
   admin and checkout. The browser downloads, parses and runs it before anything appears.
5. React mounts, the router runs, and the app calls the API on Railway (another origin, another
   connection): `/api/auth/me` and `/api/auth/refresh` (both 401 for anonymous visitors),
   the storefront settings, and `/api/products` (56 KB, uncompressed, no caching headers).
6. Only now does the page know which photos to show, and it requests them from
   media.yarne-acc.com (yet another origin). Each photo is the full original: up to 1536x2048 and
   0.1 - 2.1 MB.
7. Second visit: browser cache serves photos with no request at all; Cloudflare edge serves the
   rest. HTML, JS and CSS only cache for 4 h (see below).

## 3. Audit results (mobile, simulated slow 4G)

| Metric | Value |
|---|---|
| Performance score | 56 |
| Accessibility / Best practices / SEO | 96 / 92 / 100 |
| First Contentful Paint | 5.8 s |
| Largest Contentful Paint | 24.9 s |
| Speed Index | 9.7 s |
| Time to Interactive | 26.2 s |
| Total blocking time | 80 ms |
| Layout shift | 0 |
| Total transferred | 12.7 MB (29 photos = 11.3 MB) |

LCP breakdown: server response 170 ms, render delay 2.1 s - the rest is the image download itself.

### Findings, biggest first

1. **Photos are shipped at full size.** 11.3 MB of the 12.7 MB is photos. Lighthouse estimates
   7.8 MB savings. Files are 1536x2048 webp, quality too high, shown at a fraction of that size.
   There are no resized variants and no srcset.
2. **No code splitting.** `routes.tsx` imports every page statically; zero `lazy()` calls. Admin,
   checkout and account code ships to every visitor. 213 KB of the JS is unused on load.
3. **Hashed assets cached only 4 h** (`max-age=14400`, Cloudflare default) although their filenames
   change on every build and could be cached for a year. Cache-insight estimates 618 KB re-download.
4. **Google Fonts via CSS `@import`** - 3 families (Cormorant Garamond, DM Sans, Inter with a full
   100-900 axis), render-blocking, a request chain, 213 KB. Lighthouse: 852 ms blocking.
5. **`config.js` blocks the parser** (601 ms on slow 4G).
6. **Anonymous visitors call `/api/auth/me` and `/api/auth/refresh`** and get two 401s on every
   load: wasted round trips plus console errors.
7. **`/api/products` is 56 KB uncompressed with no Cache-Control/ETag** and returns 354 image
   references for 8 products (every colour/size image), though a listing needs one.
8. **Three PNGs (530 KB) are bundled in `/assets`** (`*Gen-removebg-preview*.png`).
9. **Hero preload script is blocked by the CSP** (inline script, `script-src 'self'`). Fix: move
   it to its own file under `public/` and load it after `config.js`. Do NOT add `unsafe-inline`.
10. Service worker `CACHE_VERSION` never changes (`yarne-shell-v5`) - stale-bundle risk.
11. Cloudflare Image Transformations is NOT enabled: `/cdn-cgi/image/...` on media.yarne-acc.com
    returns 404.

## 4. Optimisation plan (ordered by payoff / effort)

1. **Resize the photos** (expected: 12.7 MB -> about 1.5 MB).
   Option A - Cloudflare Image Transformations: enable it for the zone (dashboard: Images ->
   Transformations), then request
   `https://media.yarne-acc.com/cdn-cgi/image/width=480,quality=75,format=auto/<file>.webp`
   with a `srcset` of about 320/480/800/1200. Free tier covers 5,000 unique transformations/month.
   Option B - generate variants on upload in the backend and store them beside the original.
   Either way, add `width`/`height`, `sizes`, `loading="lazy"` and `decoding="async"` for
   below-the-fold cards, and `fetchpriority="high"` for the hero only.
2. **Extend the Cache Rule to `/assets/*` on yarne-acc.com** (Edge TTL + Browser TTL 1 year).
   Safe: filenames are content-hashed. Do NOT do this for the HTML.
3. **Split the bundle by route** with `React.lazy` + dynamic `import()` for Admin, Checkout,
   Account, OurHistory, StaticContent. Target: storefront entry bundle under about 400 KB raw.
4. **Self-host fonts**: subset to Latin + Cyrillic, ship woff2, `font-display: swap`, preload the
   one or two used above the fold, drop unused weights and probably Inter.
5. **Fix the hero-preload CSP violation** (finding 9).
6. **Skip `/api/auth/me` and `/api/auth/refresh` when there is no session hint**
   (e.g. no logged-in flag in localStorage).
7. **API**: enable response compression, add `Cache-Control: public, max-age=60,
   stale-while-revalidate=300` + ETag on `/api/products`, and return only the primary image in
   the list response.
8. Convert the three bundled PNGs to webp and lazy-load them.
9. Version the service worker cache with the build hash.
10. Later: put the frontend on Cloudflare (Pages/Workers) so HTML is served from the edge; consider
    SSR/prerender only once traffic data justifies it (see the SEO plan).

## 5. How to re-measure

    npx lighthouse https://yarne-acc.com/uk --only-categories=performance --view

Or DevTools -> Lighthouse -> Mobile. Compare: total transferred bytes, LCP, and number of
requests to media.yarne-acc.com. Not yet run: a desktop-profile audit and real-user (field) data.
Lighthouse's throttling is deliberately harsh; real 4G/Wi-Fi numbers will be lower, but the ratios
between before and after are what matter.

## 6. Instagram in-app browser: page jumped while scrolling (fixed, not yet pushed)

Symptom (screen recording IMG_3151.MP4, iPhone, link opened from Instagram): while scrolling, the
hero text and the "Femmora / Cherie / Yarne Care" section rescaled and shifted on every nudge.

Cause: Instagram's webview is resized as its own top bar and bottom toolbar slide away. Unlike
Safari's collapsing URL bar (svh stays, only lvh moves), a resized webview has one viewport, so
100svh, 100lvh, 100dvh and window.innerHeight all follow the bars. Every section sized from them
re-laid out each time, and --browser-bar-b (lvh minus svh) was 0 there, so nothing absorbed it.

Fix: `src/app/utils/stableViewport.ts` (in-app browsers only, detected from the user agent) holds
the layout height in `--app-svh` (shrink-only, resets on rotation, ignores the keyboard) and sets
`--browser-bar-b` to the gap up to the screen height. theme.css defaults `--app-svh` to `100svh`
so every other browser is unchanged. Home hero, FeaturedShowcase, BestSellersCarousel and
WhyYarneSection now use `var(--app-svh)` (and its px maths use `getStableViewportHeight()`).
Cart drawer and the Nova Poshta picker are deliberately left following the real viewport: a modal
should hug what is visible.

Verified in headless Chrome emulating an Instagram iPhone, viewport 690 -> 800 (bars hiding):
old production build - document +693 px, hero text +110 px, photo boxes 289 -> 396 px;
fixed build - document +0, every section the same height, 0 of 8 tracked elements moved.
Keyboard, rotation and non-Instagram user agents checked too.

Not verified: a real device. Open the site from Instagram with `?vpdebug` appended; the overlay
now shows `app-svh`, `stable` and `in-app true` when the lock is active.

### Update: page opened with the bars already hidden

The hold starts from the shortest height seen, so a page loaded while the bars were out of view
(e.g. a full reload after scrolling down) began tall and shifted once when they returned.
`stableViewport.ts` now remembers the shortest height per device (localStorage key
`yarne.viewport.min.v1`, one slot per width x screen height, 30 day expiry, written only after
the value has held for 1.5 s) and starts from it. Tested with proportions measured from the
recording (bars out: 76% of the screen, hidden: 91%, so about 120 px of travel on an 852 px phone):

- first visit, opened with bars out, then hidden: nothing moves
- reload with bars hidden, device remembered: nothing moves (starts at 652 px while the viewport is 772)
- very first visit ever, opened with bars hidden: still adjusts once (nothing to remember yet)

A guess from the screen size was rejected on purpose: on Android Instagram there is only a top bar,
so a small gap there would be misread as "bars hidden" and shrink the layout on the common path.
