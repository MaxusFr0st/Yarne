# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — shoppers:** People who discover Yarné via Instagram, TikTok, PR, or search and want to buy knitted bags and knitted accessories. Job: find a piece that feels special, understand why it’s worth owning long-term, configure options (color, furniture hardware, size, lace/strap where offered), and purchase with confidence.

**Secondary — admins:** Staff who create and maintain products and review/manage orders. Job: keep the catalog and order pipeline accurate so the storefront stays trustworthy.

## Product Purpose

Yarné is a Ukrainian-first e-commerce storefront (PWA) for knitted bags and knitted accessories, with an admin console for catalog and order operations. Success means a visitor chooses Yarné as the lasting detail in their look—not a disposable seasonal bag—and completes purchase; admin success means products and orders stay current without friction.

## Positioning

Yarné makes bags meant to stay with you forever, not for one or two seasons: washable so they can look new again, free repair when damaged because quality is a stand Yarné takes, and designed as the one detail that makes a look sophisticated and unforgettable. It is not a regular cosmetic bag—it is *the* cosmetic bag (and knitted accessory) from Yarné: small things made cute, with a precise touch of detail.

## Operating Context

- Storefront browsing and purchase on mobile and desktop (often after social discovery).
- Product configuration on the PDP (color, furniture hardware, size, optional lace as strap).
- Cart → checkout → account/orders for customers.
- Admin workflows: create products, manage catalog/media, review and progress orders.
- Locales: Ukrainian (default) and English; admin UI is English-only.
- Currency in active commerce: ₴.
- Contact / social evidence in product: `yarne.acc`, `hello@yarne.acc`, Instagram/TikTok `@yarne.acc`.

## Capabilities and Constraints

**Confirmed**
- Customer storefront with collection, PDP variants, cart, checkout, auth (including optional Google OAuth).
- Admin area for products, orders, users, and storefront contents.
- PWA install shell (manifest + production service worker; not full offline commerce).
- Stack in repo: React 18 + Vite 6 + Tailwind (front); .NET 9 Web API + EF Core + PostgreSQL (back).
- Lace/strap is a first-class product axis where configured.
- Nav destinations Journal / About may be incomplete until built.

**Catalog roadmap (confirmed direction)**
- Now: knitted bags & accessories.
- Next (not sweaters): adjacent accessories such as cute belts, hats, and knitted shawls.
- Broader classic knitwear (e.g. sweaters) is not the near-term line; treat sweater-oriented seed/marketing leftovers as legacy, not product truth.

**Open / undecided**
- Exact geographic shipping footprint and repair logistics beyond the free-repair promise (operational detail not fully specified here).
- Pricing tiers and collection taxonomy beyond what’s live in admin/catalog.

## Brand Commitments

- Name spelling: **Yarné** (accent required in customer-facing UI; “The Knit Gallery” / “Галерея трикотажу” used as gallery framing).
- Voice: quality that lasts, soft sophistication, craft detail, permanence over seasons; never “generic cosmetic bag.”
- Identity assets already in use: wordmark/logo (`YarneFront/public/logo.png`, `Logo` component), cream `#F5F2ED`, ink `#2D241E`, accent `#4A0E0E`, fonts Cormorant Garamond (display) + DM Sans (UI). These are existing commitments to preserve unless the user explicitly rebrands.
- Tagline in footer copy: “Crafted slowly. Worn forever.”

## Evidence on Hand

- Logo / PWA icon: `YarneFront/public/logo.png`
- Inline wordmark: `YarneFront/src/app/components/Logo.tsx`
- Editorial / home-scroll photos: `YarneFront/src/assets/home-scroll/*`, history hero and product JPGs under `YarneFront` assets
- Copy and i18n: `YarneFront/src/app/i18n/locales/uk.ts`, `en.ts`
- Our History narrative (founded 2025) in the storefront pages
- Do **not** invent testimonials, press quotes, customer names, or repair-case studies that are not in the repo or provided by the team

## Product Principles

1. **Forever over fashion cycles** — Design and copy privilege longevity, care, and repair over trend disposability.
2. **The detail that finishes the look** — Yarné sells the precise accent that makes an outfit sophisticated and memorable, not commodity accessories.
3. **Quality you can return to** — Wash-to-renew and free repair are product promises future UX must not contradict or dilute.
4. **Social-to-shop clarity** — Visitors arriving from IG/TikTok/PR/search should quickly see what Yarné is, why it’s different, and how to buy.
5. **Admin keeps the promise real** — Catalog and order tools exist so the quality story stays operationally true.

## Accessibility & Inclusion

No separate legal a11y standard was set in this init. Preserve existing patterns already in the codebase (skip links, focus-visible affordances, `prefers-reduced-motion`, safe-area handling) and do not regress them. Ukrainian as default locale is a product inclusion commitment for the primary market.
