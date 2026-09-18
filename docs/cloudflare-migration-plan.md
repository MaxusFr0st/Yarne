# Cloudflare migration & SSR plan

Working plan for moving Yarné photo storage and the frontend to Cloudflare, and
deciding on SSR. Written for an agent to execute phase by phase.

**Execute phases in order. Each phase ends with a verification gate — do not
start the next phase until the current one is verified in production.**

Phases 1–3 are worth doing even if Phase 4 never happens. Nothing in them is
throwaway work.

---

## Current state (verified 2026-09-18)

- **Frontend**: Vite SPA, React Router 7 in data mode (`createBrowserRouter`),
  served from a small Node server on Railway — `YarneFront/scripts/server.mjs`.
  That server already injects per-product OG/Twitter meta by calling the API.
- **Backend**: ASP.NET on Railway. Public read endpoints, no auth needed for
  `/api/products`.
- **Product photos**: stored on the API container local disk at
  `wwwroot/uploads/`, served by that container. No CDN.
- **Share photos only**: already on Cloudflare R2 via `R2ImageStorageService`.
- **Cache headers on `/uploads/`**: fixed in commit `941d328f` (2026-09-02),
  present on `main`. Sends `public, max-age=31536000, immutable`.
- **Service worker** (`YarneFront/public/sw.js`): deliberately skips all
  cross-origin requests, so it never caches product photos (they live on the
  API origin, not the frontend origin).
- **SEO**: no `robots.txt`, no `sitemap.xml`, no JSON-LD, no canonical, no
  hreflang. `index.html` hardcodes `lang="en"` while `DEFAULT_LOCALE` is `uk`.
- **Category URLs**: do not exist. `Collection.tsx` expresses all filtering as
  query params (`?filter=new`, `?collection=3`).

### Where image URLs are stored (the Phase 2 migration surface)

| Table / field | Notes |
|---|---|
| `Product.ImageUrl` | primary image |
| `Product.ShareImageUrl` | **already R2 — do not touch** |
| `ProductImage.ImageUrl` | gallery |
| `ProductColorImage.ImageUrl` | per-colour variants |
| `ProductColorSizeImage.ImageUrl` | per-colour-per-size variants |
| `OrderItem.ProductImageUrl` | **historical snapshot — see warning in 2c** |
| `StorefrontSettings` JSON values | hero image etc. See `ExtractUploadPathsFromJson` |

Focal points are keyed by image URL (`PATCH /api/images/focal-point`), so any
URL rewrite must keep focal-point rows consistent.

---

## Phase 1 — Confirm whether the cache fix is actually live

**Goal**: find out whether the reported "photos refetch every time" is simply an
undeployed fix. Costs minutes. Do this before anything else.

### Steps

1. Determine the live API origin (Railway variable `VITE_API_URL`, or read
   `dist/config.js` on the deployed frontend).
2. Get a real filename from `GET <API_ORIGIN>/api/products` →
   `primaryImage.src`, then inspect response headers:
   ```
   curl -sSI "<API_ORIGIN>/uploads/<existing-file>.webp"
   ```
3. Interpret the result:
   - `Cache-Control: public, max-age=31536000, immutable` present → the fix is
     live. The remaining cost is first-visit traffic, which only Phase 2 fixes.
   - Only `ETag`, or no `Cache-Control` → **the API has not been redeployed
     since 2026-09-02.** Redeploy the API service on Railway and re-check.

### Gate

Record the actual header output under "Notes / findings" at the bottom of this
file before moving on. Phase 2 value estimates depend on which case is true.

---

## Phase 2 — Product photos to R2 + Cloudflare CDN

**Goal**: photos served from the Cloudflare edge instead of the Railway
container. Biggest single win available.

**Why it is low-risk**: the R2 upload path already exists and is proven in
production for share images. `ShareImageUploadHelper` is the pattern to copy.

**Bonus**: removes the ephemeral-disk risk documented in `RAILWAY_DEPLOY.md`
section 6 (uploads vanish on redeploy unless a volume is attached).

### 2a. Switch new uploads to R2

File: `YarneBack/YarneAPIBack/YarneAPIBack/Controllers/ImagesController.cs`

- The `Upload` handler currently normalizes via `IImageUploadNormalizer`, writes
  to `wwwroot/uploads/{guid}{ext}` with `FileMode.CreateNew`, and returns
  `/uploads/{fileName}`.
- Replace the disk write with `IR2ImageStorageService.UploadAsync(...)`,
  mirroring `ShareImageUploadHelper.UploadAsync`. Return the absolute R2 URL.
- Keep the existing admin activity log entry; log the R2 URL as `imageUrl`.
- **Guard**: if `r2Storage.IsConfigured` is false, fall back to the current disk
  path rather than failing the upload. Do not strand the admin UI when R2 env
  vars are missing.

### 2b. Keep old URLs working (required)

- **Do not remove** the `/uploads` static handler in `Program.cs`. Existing DB
  rows still point there, and `OrderItem.ProductImageUrl` is a historical record
  on past orders that must keep rendering.
- `MediaUrlNormalizer.NormalizeForStorage` returns non-`/uploads/` absolute URLs
  unchanged, so R2 URLs already pass through correctly. Verify, do not assume.
- Frontend needs **no change**: `resolveMediaUrl` in
  `YarneFront/src/app/utils/storefrontMedia.ts` only rewrites `/uploads/...`
  paths and returns other absolute URLs as-is.
- CSP already permits R2 images — `img-src 'self' https: data: blob:` in
  `scripts/generate-serve-headers.mjs`. No CSP change needed.

### 2c. Backfill existing photos

Write a one-off admin-only endpoint or console command. Requirements:

- Idempotent — safe to run twice.
- For each `/uploads/...` file: upload to R2, then update every referencing row
  in one transaction: `Product.ImageUrl`, `ProductImage`, `ProductColorImage`,
  `ProductColorSizeImage`, and `StorefrontSettings` JSON values.
- **Leave `OrderItem.ProductImageUrl` untouched.** Those are snapshots of what
  was actually sold; rewriting them edits order history. They keep working
  because 2b keeps `/uploads` serving.
- Carry focal points across — rows are matched by URL, so update focal-point
  references in the same transaction.
- Dry-run mode first, printing planned rewrites, before any write.

### 2d. Put Cloudflare in front of R2

- Serve the bucket through a Cloudflare-proxied custom domain (e.g.
  `media.yarne-acc.com`) rather than the raw `*.r2.dev` URL, so caching and
  resizing rules apply.
- Set `R2Settings.PublicUrl` to that domain.
- Enable Cloudflare image resizing and request phone-appropriate widths from
  `ImageWithFallback` / `CrossfadeImage`. **Photos are currently normalized to a
  single size at upload, so a phone downloads a desktop-sized file — this is
  likely a larger bandwidth win than the cache headers.**

### Status: 2a/2b/2c built 2026-09-18 (not yet deployed)

- `ImagesController.Upload` now sends new photos to R2, falling back to disk when
  R2 is unconfigured.
- `Services/UploadsToR2Migration.cs` is the backfill. It reuses each file's
  existing GUID filename as the R2 key, so re-runs skip finished work.
- `R2ImageStorageService.DeleteAsync` now resolves keys by host rather than by a
  `PublicUrl` prefix, so replacing an older share image still deletes the object
  now that `PublicUrl` has moved to the custom domain.
- `/uploads` static serving is untouched; `OrderItem.ProductImageUrl` is not
  rewritten.

**Running it** (admin JWT required; `dryRun=true` is the default):

```
POST /api/images/migrate-uploads-to-r2?dryRun=true
POST /api/images/migrate-uploads-to-r2?dryRun=false
```

The dry run reports `FilesFound`, `Uploaded`, `AlreadyInR2`, `MissingOnDisk`,
`FailedUploads` and per-table rewrite counts without writing anything. Compare
`FilesFound` against the real run before trusting it.

### Gate

- Upload a new photo in Admin → confirm it lands in R2 and renders.
- Confirm an old product still renders (old `/uploads/` URL still served).
- Confirm a past order in Admin still shows its photo.
- `curl -sSI` a photo on the new media domain → expect a Cloudflare cache header
  (`cf-cache-status`) alongside the immutable `Cache-Control`.

---

## Phase 3 — SEO foundations

**Goal**: make the site findable and machine-readable. None of this requires
SSR, and all of it is needed regardless of the Phase 4 decision.

### 3a. Fix the language signal

- `YarneFront/index.html:3` hardcodes `lang="en"`, so every Ukrainian page
  declares itself English.
- `server.mjs` already rewrites the `<title>` tag per request — extend the same
  mechanism to set `lang` from the URL locale segment.

### 3b. Per-route meta, canonical, hreflang

- `server.mjs` currently only special-cases `/:lang/product/:id`
  (`PRODUCT_PATH`). Add cases for home, collection, category, our-history, and
  the static pages.
- Emit `<link rel="canonical">` and reciprocal
  `<link rel="alternate" hreflang="uk|en|x-default">` on every page.

### 3c. robots.txt and sitemap.xml

- Neither file exists. Add both.
- The sitemap must be generated from live data (products are admin-editable), so
  serve it from `server.mjs` backed by `GET /api/products`, with a short cache.
- In `robots.txt`, make a deliberate decision about AI crawlers. Allowing
  citation-in-search and allowing training are separate choices — **surface this
  to the user rather than picking silently.**
- Disallow `/admin`.

### 3d. JSON-LD structured data

- `ProductDetailDto` already carries name, description, price, `eurPrice`,
  material, images, and `isNew` / `isBestseller`. Emit `Product` + `Offer`
  (currency UAH or EUR per locale), plus `BreadcrumbList` and `Organization`.
- Inject server-side in `server.mjs` so non-JS crawlers see it.

### 3e. Real category routes

**This is the fix for "what knitted accessories do you sell?" — there is
currently no URL, no `<h1>`, and no prose on that topic anywhere on the site.**

- Categories exist in the DB (`YarneCatalogSeed.cs:38`: Tops, Bottoms,
  Outerwear, **Accessories**, Footwear, Sweaters, Cardigans, Vests, Jackets).
- Add `/:lang/collection/:category` as a real route in `routes.tsx`, keeping the
  existing query-param filters working for back-compat.
- Each category page needs a localized `<h1>` and a genuine intro paragraph — an
  empty grid ranks for nothing. Copy is a content task: **flag it for the user
  rather than inventing marketing claims.**
- Add `ItemList` JSON-LD listing the products.
- Include category pages in the sitemap.

### Gate

- `curl` a product URL with JS disabled and confirm title, canonical, hreflang,
  and JSON-LD all appear in the raw HTML.
- Validate JSON-LD with Google Rich Results Test.
- Confirm `/uk/collection/accessories` returns a real page.

---

## Phase 4 — SSR on Cloudflare (decide after Phase 3)

**Do not start this phase automatically.** Re-evaluate with real search-traffic
data once Phases 1–3 have been live for a few weeks.

### Why Cloudflare changes the calculus

SSR from a single Railway region can make the site *slower* — every visitor pays
a round trip to one machine. On Cloudflare, rendering happens at the edge near
the visitor, and the rendered HTML can be cached at the edge and purged on admin
edit. That is what makes SSR cheap rather than expensive.

### Hard requirement

**Product data would still live on Railway.** If an edge render calls Railway on
every request, SSR gains nothing — it just adds a hop. Edge caching of rendered
HTML, with purge-on-edit, is the entire point. Design it in from the start or do
not do this phase at all.

### Known obstacles (check before committing)

- **Migration shape**: React Router 7 is already a dependency, so this means
  moving from data mode (`createBrowserRouter`) to framework mode with loaders.
- **Browser-only code at module scope** breaks server rendering:
  `installBrowserBarInset()` in `main.tsx`, the `localStorage` read in
  `resolvePreferredLocaleSync` (`routes.tsx:29`), and the inline hero-preload
  script in `index.html`.
- **Emotion / MUI** need a per-request style cache.
- **i18next** needs per-request init, not module-level init.
- **Worker bundle size**: the app pulls in MUI + Radix + recharts + motion.
  Measure the server bundle early against the Cloudflare limit.
- **`AdminPage.tsx` is 6,282 lines** — keep it strictly client-only.
- **Service worker** currently caches `/index.html` for navigations (`sw.js`),
  which would serve stale SSR HTML. Its strategy needs revisiting.
- **CSP**: `script-src 'self'` has no `'unsafe-inline'`, nonce, or hash. SSR must
  inline hydration state, so a per-request nonce is required. This is *easier*
  on Workers than on the current setup.

### Pre-existing bug to check first

The inline hero-preload `<script>` in `index.html` appears to be blocked by the
current CSP (`script-src 'self'`, no nonce or hash) — meaning that optimization
may never have run in production. Verify in the browser console on the live
site. Worth fixing regardless of which path is chosen.

---

## Notes / findings

- **2026-09-18, Phase 1 partial evidence**: DevTools Network tab on `/collection`
  shows `.webp` product photos returning in 5–7ms with Size column reading
  `(disk cache)` — the browser is reusing a cached copy, not re-fetching over
  the network. This is consistent with the `941d328f` header fix being live,
  but is not conclusive on its own: Chrome also does heuristic caching (no
  `Cache-Control` needed) for a same-session reload. **Still do the explicit
  `curl -sSI` header check** — it is the only way to tell "fixed and durable
  for 1 year" apart from "the browser guessed right this one time." Also note
  this DevTools view only reflects *this browser, this device, second visit*;
  it says nothing about first-time visitors or other devices, which is most
  real traffic and is what Phase 2 (CDN) actually fixes.
- **Confirmed: `R2Settings.PublicUrl` is currently set to a `pub-xxx.r2.dev`
  free/dev subdomain** (seen in `OrderItemSnapshotHelperTests.cs` and the
  `DEFAULT_IMAGE_URL` fallback in `server.mjs`), not a custom domain. Cloudflare
  documents the `r2.dev` subdomain as unsuitable for production traffic (rate
  limited, no cache control). **Phase 2d's custom-domain step is not optional
  polish — switch off `r2.dev` before or during the Phase 2c migration**, so
  every URL is written once, to its final address.
- **R2 credentials already exist in production** (share-image upload already
  works), so Phase 2 needs no new Cloudflare account setup — only connecting a
  custom domain to the existing bucket and pointing `PublicUrl` at it.
- **Railway volume access gotcha**: `railway run` opens an ephemeral container
  that does *not* have the production volume mounted. The migration script in
  2c must run as code *inside the deployed API* (a temporary authenticated
  admin endpoint, or a startup task gated behind an env flag) so it can read
  `wwwroot/uploads` directly — not as an external CLI script trying to reach
  the disk from outside.
