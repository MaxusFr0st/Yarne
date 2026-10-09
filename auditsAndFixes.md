# Yarné: audits, TLDRs and fixes still to do

Written 9 October 2026. The audits ran on 6 October 2026 against the live site `https://yarne-acc.com` and the code.
Everything in parts 1 to 3 is a summary; the three full audit reports are copied word for word in part 6.

Contents

1. TLDR scores
2. What the audits found (summary)
3. What has been fixed since
4. Fixes still to do
5. Built but not yet tested on the live site, and setup only the owner can do
6. The three full audit reports (SEO and AI, purchase funnel, design and accessibility)

---

## 1. TLDR scores

Scores as given on 6 October, before any fixes. They are a judgement from the three audits, not a measured benchmark, and they have not been re-scored since.

| Area | Score | Why |
|---|---|---|
| SEO (Google) | 3/10 | Good links, URLs and speed, but no sitemap, canonical, structured data, and thin titles |
| AI visibility | 1/10 | ChatGPT, Claude and Perplexity receive an empty page |
| Visual design | 7.5/10 | Coherent brand, strong photography, good hero and product page |
| Accessibility | 4/10 | Low-contrast small text, invisible keyboard focus, menus that aren't real dialogs |
| Ease of ordering | 7/10 | Three clicks and four fields, guest checkout works |
| Trust and persuasion | 3.5/10 | No payment explanation, placeholder policy page, no reviews, no guest tracking |
| **Overall** | **4.5/10** | The shop looks good and ordering is short; what's missing is everything around it |

The SEO, AI visibility, ordering and trust rows are the ones the work since then was aimed at. Accessibility and visual design are untouched.

---

## 2. What the audits found (summary)

### What is right

- **Ordering is short.** Guest checkout on one page, four typed fields plus the Nova Poshta picker, three clicks from home to order placed. No forced account.
- **Checkout form details.** Correct autofill and mobile keyboards, entered data survives reload and failed submits, and the server re-prices every line.
- **Guarantee and care sit directly under the buy button**, and the care pages are the best-built part of the site (contrast, tap targets and keyboard handling all pass).
- **Brand is coherent.** Three colours carry almost everything, and the base text contrast is strong (13.6:1).
- **Navigation uses real links**, there is one `h1` per page, all images have alt text, and both languages have every translation key.
- **Technical basics.** http/www redirects, `/uk` and `/en` URLs, share-card tags per product, self-hosted fonts, lazy images, code splitting, no sideways scroll on phones.
- **Speed is good on desktop** (Plerdy measured 760 ms to the largest element, no layout shift).

### The eight "fix first" problems

1. No payment, and no explanation of payment.
2. Crawlers and AI bots got an empty page.
3. No `sitemap.xml`, no `llms.txt`, no real `robots.txt`, no structured data.
4. Every unknown URL returned 200, including products that don't exist.
5. Delivery & Returns was placeholder text and promised express delivery that doesn't exist.
6. No analytics at all.
7. Contact email `hello@yarne.acc` was probably undeliverable.
8. Quick add ordered the wrong variant.

### High

- Search did nothing.
- "Size guide" button has no handler.
- Place order was disabled with no reason shown.
- Customers can see developer errors such as "check Railway deploy logs".
- Guests could not track an order.
- The English site couldn't actually be ordered from.
- English product pages show Ukrainian names and descriptions (products have one language field).
- English home copy was wrong for the product (wool mills next to cotton bags).
- No canonical or hreflang tags; each product has two URLs (`/product/22` and `/product/YRN-539393`).
- Home, collection, delivery, terms and history all shared the title "Yarné".
- Nothing near the buy button about delivery, payment, returns or production time; no reviews anywhere.
- Low-contrast text is widespread: about 94 text styles fail the 4.5:1 minimum, many at 10–11px.
- Keyboard focus is nearly invisible site-wide; checkout inputs have no focus style.
- Mobile menu, cart drawer and login modal are not real dialogs (no focus trap, Escape doesn't close the menu or cart, the page behind the menu scrolls).
- Collection on phones: Filter and Sort are pushed off-screen, and product cards need two taps to open.
- Collection filter bar never sticks on desktop.
- A retry after a timeout can create a duplicate order (inferred from code, not reproduced).

### Medium and low

- Product page on phones: "Add to bag" sits at or below the fold with no sticky bar; description is collapsed.
- Product details on desktop are only rendered when the accordion is opened, so that text is absent for crawlers.
- Cart: "Shipping & taxes calculated at checkout" is untrue; colour and size appear in English on the Ukrainian site; saved prices can go stale; no quantity cap.
- Confirmation was minimal; emails were Ukrainian-only with a wide table layout.
- Trust gaps: no privacy page, the "Terms and Privacy Policy" line in login isn't linked, no seller details, returns statements contradicted each other.
- Account: "Save changes" only flashes "Saved!"; there is no password reset.
- API failure looks like an empty catalogue, with no retry; the product page loads as a blank half-screen.
- Home page: one empty `h2`, a clipped headline word in the story section ("Пляжний костюм"), a typo in admin content ("сторювати"), an English hero headline on `/uk` with no keyword like "knitted bag".
- Images are full-size originals with no responsive sizes; hashed assets are cached for only 4 hours.
- Small tap targets: header icons 20px, swatches 14–30px, gallery dots 6px, language buttons.
- English wording is inconsistent: "Bag" vs "Cart", "Sign in" vs "Sign In", mixed title and sentence case.
- Design system is not tokenised: 720 hardcoded colour values, about 40 font sizes, eleven corner radii, the primary button rebuilt at five heights.
- Unused dependencies: MUI, Emotion, react-slick, next-themes and 44 of 46 `components/ui` files.
- Collection renders every product twice (desktop and mobile grids); the product page has two `h1` elements.
- Opening a page by URL can land scrolled down.

### Plerdy reports (home page only)

- **Confirmed our findings:** short generic title and description, no canonical / hreflang / structured data, no reviews or trust signals, no email capture, English hero headline on a Ukrainian page.
- **New, worth checking:** a large empty beige block between the hero and the products (never confirmed, may be a screenshot artefact of fade-in sections); one empty `h2`; the hero button reads as weak; small language switcher and tap targets.
- **Ignore:** French titles and keywords, "meta robots missing", "H1 too long", the invented "Rated 4.9 by 1,200 happy customers" and "10% off" examples, "23 duplicate links, 314 inline styles".

### Not checked by the audits

- No real order was placed during the audit; confirmation, emails and logged-in pages were traced from code only.
- Google's own rendered view and index status (needs Search Console).
- Real phones; mobile tests were browser emulation.

---

## 3. What has been fixed since

All of this is pushed to `main` and live.

| Audit finding | Status |
|---|---|
| 1. Payment not explained | Done. Became the full flow: choice after acceptance (bank transfer or pay on pickup), transfer details set in admin, "I have paid" with a receipt photo, "Payment received", euros for orders abroad. |
| 2. Empty page for crawlers and AI | Done. The server writes each page's text and a machine-readable product card into the HTML. |
| 3. Sitemap, robots, `llms.txt`, structured data | Done, generated from the product list. |
| 4. Unknown URLs returned 200 | Done, real 404s. |
| 5. Delivery & Returns placeholder | Done, with the real timing and returns rule, editable in admin in both languages. |
| 6. Analytics | Not built, by the owner's decision. Plan is in `finalPolish.md`. |
| 7. Contact email | Done in code (`anastasiia.moroz.yarne@gmail.com`). Admin text overrides it; see part 5. |
| 8. Quick add wrong variant | Done. One version: added exactly. A choice of size, strap or hardware: opens the product page. |
| Search did nothing | Done on desktop. No search icon on phones, by the owner's decision. |
| Guests could not track an order | Done. Order numbers `Y`+date+`-N`, a status page by private link, guest orders attach to an account by verified email. |
| English site couldn't be ordered from | Done. Ukraine / Abroad switch, Nova Post picker per country, other-country address, Latin names, foreign phones, EUR prices and payment. |
| Place order disabled with no reason | Done. The button points at the first missing field. |
| Developer errors at checkout | Done for checkout. One remains elsewhere; see part 4. |
| Canonical, hreflang, per-page titles | Done. |
| Leftover template text ("The Knit Gallery", wool mills, "since 2011") | Removed from code. Admin-saved texts still need the owner; see part 5. |
| Hardware colour missing from order emails | Done. |
| Minimal confirmation and emails | Done. Fuller confirmation that survives a reload, phone-friendly emails, one email thread per order, owner emails marked "[Адмін]". |
| Contradicting returns statements | Done through the single Delivery & Returns page. |

Added beyond the audits: accept and decline with a reason in admin, admin chips ("Says paid", "Paid", "Photos requested"), making-of photos on request, receipt cleanup after 30 days, a friendly error page when a tab is left on an old version.

---

## 4. Fixes still to do

Nothing here is started. Items marked **design** change how the site looks or behaves, so they need the owner's approval before any work.

### Do first

| # | Fix | Why it matters | Design approval |
|---|---|---|---|
| 1 | **Privacy page**, and link the "Terms and Privacy Policy" line in the login window | The site collects names, phones, emails and receipt photos; there is no privacy page at all | Text only, new page in the existing style |
| 2 | **Size guide button** does nothing on the product page | A dead button next to the buy button | Yes: what it opens |
| 3 | **Developer wording shown to customers**: "The backend may be down — check Railway deploy logs" in `YarneFront/src/app/api/client.ts:90` | Any page that loads data can show it on a timeout | No |
| 4 | **Duplicate order on retry after a timeout** | Inferred from code on 6 October, never reproduced and not rechecked since | No |
| 5 | **Seller details** on the site (who sells, how to reach them) | Trust; also needed beside a privacy page | Text only |

### Product and collection pages

| # | Fix | Design approval |
|---|---|---|
| 6 | Nothing near the buy button about delivery, payment, returns or making time | Yes |
| 7 | No reviews or customer photos anywhere | Yes |
| 8 | Phones: "Add to bag" at or below the fold, no sticky buy bar, description collapsed | Yes |
| 9 | Product details only rendered when the accordion is opened | No visible change |
| 10 | Collection on phones: Filter and Sort pushed off-screen; cards need two taps to open | Yes |
| 11 | Collection filter bar never sticks on desktop | Yes (behaviour) |
| 12 | Collection renders every product twice; product page has two `h1` | No visible change |
| 13 | API failure looks like an empty catalogue, no retry; product page loads as a blank half-screen | Yes: error and loading states |
| 14 | No "results for X / clear" on a collection search | Yes |

### English content

| # | Fix | Design approval |
|---|---|---|
| 15 | English product pages show Ukrainian names and descriptions; products need English fields in the backend and admin | Admin form only |
| 16 | Each product still has two URLs (`/product/22` and `/product/YRN-…`); pick one form, ideally with a name slug | No |
| 17 | English wording inconsistent: "Bag" vs "Cart", "Sign in" vs "Sign In", mixed case | Text only |

### Accessibility

| # | Fix | Design approval |
|---|---|---|
| 18 | Low-contrast text: about 94 text styles under 4.5:1, many at 10–11px | Yes: colours and sizes change slightly |
| 19 | Keyboard focus nearly invisible; checkout inputs have no focus style | Yes: a visible focus ring |
| 20 | Mobile menu, cart drawer and login modal are not real dialogs (focus trap, Escape, background scroll) | Behaviour only |
| 21 | Small tap targets: header icons, swatches, gallery dots, language buttons | Yes |
| 22 | No skip link | Hidden until keyboard use |

### Cart, account, home

| # | Fix | Design approval |
|---|---|---|
| 23 | Cart line "Shipping & taxes calculated at checkout" is untrue (still in `locales/en.ts`) | Text only |
| 24 | Cart shows colour and size in English on the Ukrainian site; saved prices can go stale; no quantity cap | No |
| 25 | Account: "Save changes" only flashes "Saved!"; no password reset | Yes for password reset |
| 26 | Home: one empty `h2`; clipped headline word in the story section; English hero headline on `/uk` with no "knitted bag" keyword; weak hero button | Yes for headline and button |
| 27 | Opening a page by URL can land scrolled down | No |

### Speed and code health

| # | Fix | Design approval |
|---|---|---|
| 28 | Images are full-size originals; no responsive sizes for phones (no `srcSet` anywhere in the code) | No visible change |
| 29 | Cache lifetime of built files was 4 hours on 6 October; not rechecked | No |
| 30 | Unused dependencies still in `package.json`: MUI, Emotion, react-slick, next-themes | No |
| 31 | Design system not tokenised (720 hardcoded colours, about 40 font sizes, eleven radii) | Should be invisible, but a large refactor |
| 32 | Type check fails on `main` with errors in `locales/uk.ts` only; the build passes | No |

### Larger features, not started

| # | Feature | Notes |
|---|---|---|
| 33 | Analytics tab in admin | Plan in `finalPolish.md` |
| 34 | Consent banner | Only needed once analytics exist |
| 35 | Newsletter signup; wishlist, promo codes, abandoned-cart emails | Only if campaigns are planned |
| 36 | Google Merchant Center product feed, Bing verification, `favicon.ico`, smaller default share image | |
| 37 | Real URLs for categories and for the language switcher (both are buttons, so Google has no links to follow) | |

Status of the items in this part: taken from the 6 October audits minus everything fixed in part 3. Items 3, 23, 28 and 30 were re-confirmed in the code on 9 October. The others were not rechecked one by one.

---

## 5. Built but not yet tested on the live site, and owner setup

### Not yet tested on the live site by anyone

- A full Ukraine order and a full order abroad, with € totals on the confirmation, emails, order page and admin.
- Admin chips ("Says paid", "Paid", "Photos requested") and the set / reset payment actions.
- Making-of photos end to end: request as a signed-in customer, upload in admin, email, gallery, deletion when the order is marked Received.
- The photo request for a guest who then creates an account.
- Emails for one order arriving as one conversation in a real inbox; owner emails starting with "[Адмін]".
- Place order on an empty checkout pointing at the first missing field.
- Care page: the email address not breaking mid-word.
- Real storage of receipts and photos (depends on the Railway setting below).

### Setup only the owner can do

- **Railway:** set `R2_PRIVATE_BUCKET_NAME`. Receipts and making-of photos need it.
- **Admin → Care → Payment details:** fill in the EUR group and the UAH payment reference.
- **Every product:** add a € price.
- **Admin → Care → Contact details:** replace `hello@yarne.acc` if it still shows.
- **Admin home text:** the English paragraphs about Scottish and Peruvian wool mills, and the "wool washing" line in the Why Yarné block.
- **Admin content typo:** "сторювати".
- **Google Search Console:** submit the sitemap (about five minutes).

### Decisions already made (do not reopen without the owner)

- No design, UX or animation change without approval. The checkout design stays as it is.
- No search icon on phones.
- No payment choice at checkout and no auto-accept; the choice comes after the owner accepts.
- Making-of photos are deleted as soon as the order is marked Received.
- No owner email on "I have paid"; admin chips only.
- English shows EUR, Ukrainian shows UAH; orders abroad are paid in EUR.
- The Nova Post country list is fixed in code; Russia and Belarus are refused.

### Links

- Designs: https://claude.ai/artifact/88Q4JgJLvbuHGM5kjrrEnA
- Clickable checkout prototype: https://claude.ai/artifact/FggupLN4ZewbUvyNj71DN4 (its third version includes a payment-at-checkout idea that was rejected)
- First easy-read summary of the audits: https://claude.ai/artifact/NbcKoHcBSU23bqcqvmv4WU
- Analytics tab plan: `finalPolish.md`

---

## 6. The three full audit reports

Copied word for word from 6 October 2026. They describe the site **before** any of the fixes in part 3, so many findings below are already solved. File paths and line numbers are from that day and may have moved.


### 6.1 SEO and AI discoverability

### Yarné SEO / AI-discoverability audit (read-only, no files changed)

#### Production domain and live test
- **Domain: `https://yarne-acc.com`** (Cloudflare in front of Railway). Evidence: `YarneBack/YarneAPIBack/YarneAPIBack/appsettings.json:14-16`, `OrdersController.cs:995`, `docs/photosLoad.md:4`. API: `https://mindful-flexibility-production.up.railway.app`. Media: `https://media.yarne-acc.com`.
- **Live tested: yes**, with curl as Googlebot and GPTBot (raw HTML, no JS). Both get identical HTML.
- **This worktree is 1 commit behind `origin/main`** (`14eeaee6`), and live runs main. Main adds per-page titles for care pages in `server.mjs` plus `src/app/hooks/usePageTitle.ts`. File:line references below are to the worktree; where live differs I say so.
- Root `index.html` and root `vite.config.ts` are stale and not deployed (Railway root is `YarneFront/`, see `YarneFront/railway.toml`). The canonical/OG tags in root `index.html:9-30` never reach production.
- The catalog is 9 products, mostly knitted bags, plus one hat and two beach sets — not garments in general. Brand copy says "knitted bag".

##### What a bot receives (live)
| URL | Status | Body |
|---|---|---|
| `/`, `/uk`, `/en`, `/uk/collection`, `/uk/pages/delivery`, `/en/pages/our-history` | 200 | Empty `<div id="root"></div>`, `<title>Yarné</title>`, description "Handmade knitwear, made to order." |
| `/uk/product/YRN-539393`, `/en/product/YRN-539393`, `/uk/product/22`, same with trailing slash | 200 | Empty root; title "Charlotte  — Yarné"; description is the Ukrainian product text (also on `/en/`); og:image is the product photo |
| `/uk/pages/care`, `/uk/pages/care/guarantee` | 200 | Empty root; own title ("Догляд за виробами — Yarné"); generic English description |
| `/uk/nonexistent-page-xyz`, `/uk/product/does-not-exist-999`, `/xx/collection`, `/admin`, `/uk/checkout` | **200** | Same shell as home |
| `/robots.txt` | 200 | Cloudflare "content signals" comment block only; no `User-agent`, `Allow`/`Disallow` or `Sitemap` lines |
| `/sitemap.xml`, `/llms.txt`, `/favicon.ico` | 404 | — |
| `www.yarne-acc.com`, `http://` | 308 / 301 to `https://yarne-acc.com/` | — |

#### What is right
- **www and http redirects** go to the apex https host (live).
- **Locale-prefixed URLs** `/uk/...` and `/en/...` exist as distinct addresses (`routes.tsx:77-99`, `i18n/config.ts:3-6`).
- **Server-side meta stamping** for title, description, OG and Twitter on every HTML response, with product name, description and photo on product pages (`scripts/server.mjs:65-82, 131-157, 193`). Verified live.
- **Admin-editable default share card** (`server.mjs:105-129`). The setting `yarne.share.default.v1` currently returns 404 from the API, so the hardcoded defaults are in use.
- **Internal navigation uses real `<a href>`**: header nav, product cards, footer, home CTAs, related products (`Header.tsx:131-140`, `ProductCard.tsx:338-344`, `Footer.tsx:109-135`, `i18n/LangLink.tsx:12-15`).
- **One `<h1>` per main page**: Home `Home.tsx:104`, Collection `Collection.tsx:176`, Product `ProductDetail.tsx:416` (mobile `MobileProductDetailView.tsx:407`), Care pages, Our History, NotFound.
- **Product image alt text** is descriptive on cards and the main photo (`ProductCard.tsx:186`, `ProductDetail.tsx:354`).
- **Fonts** are self-hosted woff2 with `font-display: swap` and unicode-range subsets (`src/styles/fonts.css`).
- **Images**: lazy by default, eager plus `fetchPriority="high"` for priority images (`ImageWithFallback.tsx:117-120, 158-160`); hero is marked `priority` (`Home.tsx:86`); `early.ts:46-55` preloads first photos. Media host sends `public, max-age=31536000, immutable`.
- **Code splitting**: checkout, account, admin, care and static pages are lazy (`routes.tsx:85-98`). The live main bundle has no MUI, recharts or react-dnd. It is 778 KB raw / 248 KB brotli; CSS 171 KB raw / 26 KB brotli.
- **Security headers** (CSP, nosniff, Referrer-Policy) are present (`scripts/generate-serve-headers.mjs:32-56`).
- **Manifest and icons** exist (`public/manifest.webmanifest`, `YarneFront/index.html:12-14`).
- **Citable content exists in the app** once JS runs: Our History, Care guides per material, Guarantee terms, Delivery, Terms, and contact details.

#### What is wrong
- **Critical — no body content in initial HTML on any route.** `YarneFront/index.html:23-26` is an empty root; `server.mjs:192-197` only swaps the `<title>` line. There is no SSR or prerender. GPTBot, ClaudeBot, PerplexityBot and social scrapers get no price, material, sizes, policy or care text; Google depends entirely on its JS render queue. Fix: prerender or SSR the public routes, or at minimum have `server.mjs` inject a server-built text block plus JSON-LD per route.
- **Critical — every unknown URL returns HTTP 200 (soft 404).** `server.mjs:185-197` serves the shell for any extensionless path; an unknown product falls through to the default card (`server.mjs:138-156`). Fix: return 404 when the path matches no route or `fetchProduct` returns null, and add `noindex`.
- **Critical — no sitemap.xml and no real robots.txt.** `YarneFront/public/` has neither; live `/sitemap.xml` is 404 and robots.txt is Cloudflare's comment-only file. Fix: generate both in `server.mjs` from `/api/products` and the care materials.
- **Critical — no structured data anywhere.** A grep for `ld+json` in `YarneFront/src` and `server.mjs` returns nothing. Fix: inject Organization, WebSite, Product/Offer, BreadcrumbList server-side.
- **High — no canonical, no hreflang, no robots meta.** `buildMetaBlock` (`server.mjs:65-82`) emits none. `og:url` echoes the raw request URL including query string and the `*.up.railway.app` host if hit directly (`server.mjs:132, 190-191`). Fix: emit a canonical on a fixed origin, reciprocal `hreflang` uk/en/x-default, and `noindex` for checkout, account, admin and 404.
- **High — duplicate product URLs.** `/product/22` and `/product/YRN-539393` both return 200 (`server.mjs:84-85`). Cards link by numeric id (`ProductCard.tsx:115-118`), the account page by product code (`AccountPage.tsx:217`). `?color=` variants and trailing-slash versions also return 200. Fix: pick one form (ideally a name slug), 301 the others, canonicalise away `?color`.
- **High — `/` has no server redirect.** Bare `/` returns the 200 shell and redirects client-side from localStorage (`routes.tsx:37-49, 116`). Unprefixed paths like `/collection` and invalid locales like `/xx/collection` behave the same. Fix: 301 `/` to `/uk` in `server.mjs`, and 301 or 404 unprefixed paths.
- **High — `<html lang="en">` is hardcoded** while the default locale is Ukrainian (`YarneFront/index.html:4`); it is only corrected by JS (`Root.tsx:45-52`). Fix: stamp `lang` from the URL prefix in `server.mjs`.
- **High — product content is not localised.** The Product model has a single `Name`, `Description`, `Material` (`YarneBack/.../Models/Product.cs:13,15,28`). `/en/product/...` serves Ukrainian description and meta (verified live); several names are Ukrainian only. Fix: add EN fields, or do not offer `/en` product pages as hreflang alternates until translated.
- **High — home, collection, delivery, terms and our-history share one title and description** ("Yarné" / "Handmade knitwear, made to order."), `server.mjs:17-19, 151-156`. In the worktree no code sets `document.title`; on main only care pages do. Fix: a per-route title/description map in `server.mjs`, mirrored client-side.
- **High — Delivery & Returns page ships placeholder copy.** `i18n/locales/en.ts:419` ("This page is placeholder copy…") and `uk.ts:429`; `StaticContentPage.tsx:12` renders the locale strings directly and the live settings only override `ourHistory`. Fix: write the real policy (Nova Poshta, timing, costs, returns).
- **High — contact email `hello@yarne.acc` and "yarne.acc" as the site name.** `Footer.tsx:69`, `en.ts:418, 426, 433`, and the live `yarne.contact.v1` setting. `.acc` does not look like a valid TLD and the site is `yarne-acc.com` (inference: it was copied from the Instagram handle `@yarne.acc`). Fix: confirm and correct.
- **Medium — collections are query-param states.** `?collection=<id>` and `?filter=new` (`Collection.tsx:47-51, 119-129`, `Footer.tsx:50-57`) get no distinct title or canonical. Category names ("Сумки", "Клатчі", "Костюми", "Шляпи") have no URL at all. Fix: path routes such as `/uk/collection/sumky` with their own meta.
- **Medium — language switcher is `<button>` only** (`i18n/LanguageSwitcher.tsx:72-80`), so there is no crawlable link between the uk and en versions. Fix: render `<a href>` to the alternate URL, plus hreflang.
- **Medium — headings are thin.** Product card names are `<p>` (`ProductCard.tsx:250-259`); the product page has only an h1 and the "related" h2 (`ProductDetail.tsx:416, 784`); Delivery and Terms have no h1 because `SectionTitle` defaults to h2 (`ScrollReveal.tsx:134`, `StaticContentPage.tsx:20`). Fix: h2/h3 for card names and product sections, `as="h1"` on static pages.
- **Medium — product details are collapsed and unmounted.** The accordion content is only rendered when open (`ProductDetail.tsx:717-764`). Descriptions are short (60–471 characters) and 4 of 9 products have an empty `material` in the live API. Fix: render details in the DOM by default and fill in material, dimensions and weight.
- **Medium — weak alt text in places.** Hero is `alt="Yarné Hero"` (`Home.tsx:85`); gallery thumbnails omit the product name (`ProductDetail.tsx:327, 396`); card alt is the English pattern "X in Y" on Ukrainian pages (`ProductCard.tsx:186`).
- **Medium — images are full originals with no responsive variants.** A sampled photo is 1521×2048 WebP, 238 KB. No `srcset`/`sizes` or `width`/`height` attributes in `ImageWithFallback.tsx:153-161`. `/cdn-cgi/image/` returned 404 on the media host, so transformations are not enabled. Fix: enable transformations or pre-generate sizes, add `srcset` and intrinsic dimensions.
- **Medium — no cache policy from origin.** `server.mjs:163-178` sets no `Cache-Control`, ETag or compression. Hashed `/assets/*` get only Cloudflare's default `max-age=14400`; HTML has no Cache-Control and is `cf-cache-status: DYNAMIC`. Each HTML request to a product page waits on an uncached API fetch (`server.mjs:87-96`). Fix: `immutable, max-age=31536000` for `/assets/*`, short cache for HTML, cache product lookups.
- **Medium — OG details.** `og:type` is always "website" (`server.mjs:72`); no `og:locale`; the default OG image is a 639 KB JPG on the raw `r2.dev` host (`server.mjs:20`), which the Cloudflare doc itself flags as unsuitable for production (`docs/cloudflare-migration-plan.md:296-301`); product OG images are WebP, which some scrapers handle poorly (inference). The description contains raw newlines and is cut at 200 characters (`server.mjs:67`).
- **Low — no `/favicon.ico`** (live 404); icons are PNG only.
- **Low — manifest description is Ukrainian only and `start_url` is `/`** (`public/manifest.webmanifest`).
- **Low — product title has a double space** ("Charlotte  — Yarné") because the DB name has a trailing space; trim in `server.mjs:143`.
- **Low — the API host is publicly crawlable** with no robots.txt (live 404). Add `X-Robots-Tag: noindex` on the API.

#### What needs to be added
- **Prerender or SSR for public routes** (home, collection, product, care landing/material/guarantee, our-history, delivery, terms), in `YarneFront/scripts/server.mjs` or a build-time prerender step. Smallest step: `server.mjs` injects h1, description, price, material, sizes and colours as text into `#root`, plus JSON-LD.
- **`/robots.txt`** (served by `server.mjs` or `YarneFront/public/robots.txt`): allow all; disallow `/admin`, `/*/checkout`, `/*/account`; a `Sitemap:` line; explicit groups for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Bingbot. Also review Cloudflare's AI-bot and managed robots.txt settings, since Cloudflare currently owns that file.
- **`/sitemap.xml`** generated in `server.mjs` from `/api/products` and `yarne.care.v1`: both locales with `xhtml:link` hreflang, and `lastmod`. The product API exposes `createdAt` only, so an `updatedAt` field is needed in the backend DTO.
- **`/llms.txt`** (and optionally `/llms-full.txt`) in `server.mjs`: brand summary, product list with price/material/URL, links to care, guarantee, delivery and contact.
- **Canonical, hreflang (uk, en, x-default), robots meta, `og:locale`, `<html lang>`** in `buildMetaBlock` (`server.mjs:65`), with a fixed `SITE_ORIGIN` env var instead of the Host header.
- **Real 404 status** in `server.mjs`, and 301s: `/` to `/uk`, trailing slash to none, numeric id to canonical product URL.
- **JSON-LD, server-injected**: Organization (logo, sameAs Instagram/TikTok, contactPoint) and WebSite on home; Product with Offer (price, priceCurrency UAH/EUR, availability, itemCondition), brand, material, images, sku = productCode; `hasMerchantReturnPolicy` (14 days) and `shippingDetails`; BreadcrumbList on product, collection and care; FAQPage or HowTo for care guides. No `aggregateRating`: the site has no reviews feature. Note CSP `script-src 'self'` (`generate-serve-headers.mjs:34`) — JSON-LD data blocks are not executed scripts so should not be blocked, but verify.
- **Per-route title/description map** for home, collection, delivery, terms and our-history, in both locales, plus a matching client `usePageTitle` on those pages.
- **Stable product slugs and category/collection path URLs** (backend `Slug` field, new routes in `routes.tsx`).
- **English product fields** (`NameEn`, `DescriptionEn`, `MaterialEn`) in the backend and admin.
- **Stock/availability field**: the product DTO has only `isActive`, and Offer.availability needs a source (for example a made-to-order flag mapped to PreOrder/MadeToOrder).
- **Merchant Center feed** endpoint (XML or TSV) from the API: id, title, description, link, image_link, price, availability, brand, material, colour, size, shipping.
- **FAQ page** (no FAQ route exists) and visible breadcrumbs on product pages.
- **Search Console and Bing Webmaster verification** (meta tag or DNS), **IndexNow** key file and a ping on product save, **analytics** (GA4 or Cloudflare Web Analytics) with a consent banner. None exist: no gtag, GTM, pixel or verification tag in the source or live bundle. The CSP allows `static.cloudflareinsights.com` but no beacon is in the live HTML.
- **`favicon.ico`**, and a 1200×630 default OG image under 300 KB on `media.yarne-acc.com`.

#### Cross-cutting notes (SEO touching UX, design, conversion)
- The language switcher needs to become links; this changes the animated-button component.
- The product details accordion, and the mobile product view (a separate component, `MobileProductDetailView.tsx`), must keep details, guarantee and care text in the DOM when collapsed. Related products are `hidden md:block` on desktop markup (`ProductDetail.tsx:776`) with a separate mobile component.
- Care guide topics and per-piece guides are query-param states (`?piece=`, `CareMaterialPage.tsx:76`) and need canonicals to the material URL. Care search navigates via onClick (`CareSearch.tsx:49`), which is fine as a secondary path.
- Collection tabs and filters are buttons with `replace` navigation (`Collection.tsx:119-129`); category path URLs would need real links for tabs.
- Card swatch selection appends `?color=` to the link (`ProductCard.tsx:115-118`); it needs a canonical.
- The home hero h1 is admin-edited brand copy ("Your unique bag, ma chérie!") with an empty subtitle in the live settings — no keyword such as "knitted bags" or "handmade". The hero eyebrow or subtitle is the place for it.
- Trust copy is inconsistent: "Free returns… we collect at our cost" (`en.ts:102, 527`) versus placeholder delivery and terms text. This matters for conversion and for MerchantReturnPolicy markup.
- English visitors see EUR prices (`PriceTag.tsx`, `Collection.tsx:87-88`) while descriptions stay Ukrainian. Offer currency per locale must match the visible price.
- The service worker caches the navigated HTML as `/index.html` (`public/sw.js:54-66`), so any SSR or prerender needs that strategy revisited (also noted in `docs/cloudflare-migration-plan.md:269`).
- `docs/cloudflare-migration-plan.md:175-232` (Phase 3) already plans most of the above; none of it is implemented beyond OG stamping and care titles.

#### Not verified
- How Googlebot's rendered DOM looks (no rendering test or Search Console access); index coverage and rankings.
- Cloudflare dashboard settings (AI bot blocking, managed robots.txt, cache rules, Web Analytics). Only response headers were observed; GPTBot was not blocked and got the same HTML.
- Whether `hello@yarne.acc` receives mail (inference that it is wrong).
- Core Web Vitals field data and Lighthouse were not run; `docs/photosLoad.md` has an earlier mobile audit. Local `dist` was not built; bundle sizes are from live assets.
- Heading hierarchy and alt text inside care components and `WhyYarneSection` were sampled, not read exhaustively.
- Whether live Guarantee terms use coded defaults (the `yarne.guarantee.terms.v1` setting returns 404 from the API, so presumably defaults).
- `yarne-production.up.railway.app/uk` returned 404, so the frontend's Railway hostname is different or disabled; duplicate-host exposure is not confirmed.

---

### 6.2 Purchase funnel and conversion

### Yarné purchase funnel and conversion audit

Repo root for all paths: `C:\Users\maxmoroz\Desktop\YarneApp\.claude\worktrees\website-seo-design-conversion-02d75b\`
Short names used below: `FE/` = `YarneFront/src/app/`, `BE/` = `YarneBack/YarneAPIBack/YarneAPIBack/`.

**Headline:** placing an order is short and guest-friendly, but the site takes no payment and never says how the customer pays, and the live Delivery & Returns page is unedited placeholder text. There is no analytics of any kind, so the conversion rate cannot currently be measured.

#### How I tested
- **Rendered, live production** (`https://yarne-acc.com`, domain found in the repo) at 375x812 and 1440x900, in `uk` and `en`. I walked home → collection → product → add to bag → cart drawer → checkout form → Nova Poshta picker, plus the delivery, terms, guarantee and account pages.
- **Stopped before any submission.** Nothing was typed into any field, no order placed, no account created. I added one item to the browser-local cart and removed it afterwards.
- **Code read** for everything after the Place order button (order API, emails, account) and for all file:line evidence.
- The local dev server would not start (`vite` is not installed in the worktree; I did not install it, to keep the audit read-only).
- The worktree is 1 commit behind `origin/main`, which is what production runs (per-page titles). Line numbers refer to the worktree.
- The catalogue is crocheted bags, hats and beach sets, not garments; that matters for the copy issues below.
- All friction and persuasion judgements are qualitative. I have no traffic data.

#### Funnel map
| Step | Clicks / fields | Main drop-off risk |
|---|---|---|
| Home | 0 | EN home still carries template copy that contradicts the product |
| Discovery | 1 click (card), or 1 click "Quick add" straight from a card | Search is a dead end; filters are thin (price, new, bestseller) |
| Product page | 1 click (Add to bag; first size is preselected) | No delivery time or cost, no payment or returns info, no reviews, size guide button does nothing |
| Cart drawer | Opens automatically; 1 click to checkout | "Shipping & taxes calculated at checkout" is all it says about cost |
| Checkout (one page, guest) | 4 typed fields (email, first name, last name, phone) + branch picker (1 click to open, then about 2–3 taps in the Nova Poshta widget) + 1 click Place order | No payment method or payment explanation anywhere; button is disabled with no reason shown |
| Payment | None exists | Customer does not know how or when they pay |
| Confirmation | Inline receipt on the same page | Guest's only link leads to a sign-in wall; no next steps, lead time or payment instructions |
| Post-purchase | Emails on Received, Confirmed, Shipped, Canceled | Emails are Ukrainian-only; guests cannot track; guest orders are never attached to an account |

**Minimum path, home to order placed:** 3 clicks via Quick add (4 via the product page), 4 typed fields, and the branch picker. Guest checkout works; an account is never forced. Logged-in users skip the email field and get name and phone prefilled.

#### What is right
- **Guest checkout, single page, 4 fields.** `POST /api/orders` is `[AllowAnonymous]` (`BE/Controllers/OrdersController.cs:198-199`); the email field shows only when logged out (`FE/pages/CheckoutPage.tsx:554`).
- **Autofill and mobile keyboards are correct**, verified in the live DOM: `autocomplete` email / given-name / family-name / tel, `type=email|tel`, `inputMode` (`CheckoutPage.tsx:565-567, 596, 620, 647-649`). Inputs are 16px, so iOS does not zoom (`FE/components/CheckoutField.tsx:74-81`).
- **Forgiving validation.** Errors wait for blur or a 600 ms pause (`CheckoutPage.tsx:219-233`); the phone accepts pasted `+380…`, `380…` and `0…` forms (`FE/utils/phoneUa.ts:18-24`).
- **Error recovery keeps data.** Fields live in sessionStorage and survive a reload (`CheckoutPage.tsx:132-136`); a failed submit leaves the form and cart intact (`CheckoutPage.tsx:359-363`).
- **Cart persists** in localStorage across reloads and browser restarts (`FE/context/AppContext.tsx:144-173, 302-308`); confirmed live.
- **The server re-prices every line** from the database, so a tampered or stale client price cannot reach the order (`OrdersController.cs:341-350`).
- **Delivery cost is shown before placing**, labelled "paid to Nova Poshta on pickup" (`CheckoutPage.tsx:264-284, 686-700`).
- **Guarantee and care sit right under the buy button** on mobile and desktop (`FE/pages/ProductDetail.tsx:767-768`, `FE/components/MobileProductDetailView.tsx:868-874`). The live guarantee page is clear: covered / not covered, 4 steps, FAQ, phone and email.
- **Product page basics are solid.** Price is always visible, 6 photos with swipe and thumbnails, colour swatches carry through from the card (`?color=`), composition is in the subtitle, and related products show.
- **Speed work is real.** An early-request script fetches data in parallel with the app (`YarneFront/src/early.ts`), photos are queued by priority (`FE/components/SitePrefetch.tsx`), and checkout, account and admin are split out (`FE/routes.tsx:86-87`).
- **Status emails and account tracking exist.** Emails go out on four status changes plus an internal new-order notice (`OrdersController.cs:420, 500-509, 927-940`). The account page shows order history, TTN and live Nova Poshta status (`FE/pages/AccountPage.tsx:245-258`).
- **Global rate limit** of 120 requests/min per IP (`BE/Program.cs:117-135`).

#### What is wrong

**Critical**
- **Checkout/payment: no payment and no explanation of it.** The checkout has no payment selector or text, and the backend silently assigns the first payment method in the table (`OrdersController.cs:264-288`; the seed list starts with "Credit Card", `BE/Data/YarneCatalogSeed.cs:130`). No payment provider exists in the repo. Terms say "Payment is charged when your order is confirmed" (`FE/i18n/locales/en.ts:429`) and the email builder comments "that's what the card is charged" (`BE/Services/OrderConfirmationEmailBuilder.cs:150`), yet no card is ever taken. Fix: state the real method next to the button and on the confirmation and email (e.g. "we call to confirm, then prepayment or pay on pickup"), or integrate a provider.
- **Trust: the live Delivery & Returns page is placeholder text.** Production shows "Це тимчасовий текст — оновіть терміни, перевізників і правила повернення під вашу політику", and promises "express delivery at checkout", which does not exist (`FE/i18n/locales/uk.ts:~425-429`, `en.ts:416-419`). Fix: write the real policy (Nova Poshta only, made-to-order lead time, who pays return shipping).
- **Measurement: no analytics at all.** Live check: no `dataLayer`, `gtag`, `fbq` or `ttq`; the only hosts contacted are the site, the API, the media CDN and the Nova Poshta widget. Nothing in `YarneFront/index.html` or `src`. Fix: see "What needs to be added".

**High**
- **Trust/support: the contact email is probably undeliverable.** `hello@yarne.acc` is used everywhere (`FE/components/Footer.tsx:69`, `FE/components/care/careUi.tsx:54`, `FE/utils/contactContent.ts:29`, terms and delivery copy), and terms call the site "yarne.acc". The real domain is `yarne-acc.com`; `.acc` is not a TLD as far as I know (not verified by sending mail). Fix: use a working address on the real domain.
- **Discovery: search is a dead end.** The overlay input has no `value`, `onChange` or submit; typing does nothing (`FE/components/Header.tsx:447-455`). Its placeholder reads "Cashmere, turtleneck, bouclé..." (`en.ts:29`). Fix: wire it to a product filter or remove the icon.
- **Product page: the "Size guide" button has no handler** on desktop (`ProductDetail.tsx:619-625`) or mobile (`MobileProductDetailView.tsx:750-756`). Fix: open a dimensions panel (bag measurements in cm) or remove it.
- **Product page: nothing about delivery, payment, returns or lead time near the buy button.** The home page says items are made to order, but no production time appears on the product page, cart or checkout. Fix: add 3 short lines under Add to bag.
- **Product page: no reviews or other social proof** anywhere in the repo or on the live site. Fix: add customer photos or reviews, or at least an Instagram feed block.
- **Quick add writes a wrong size.** It hardcodes `size: "S"`, omits `eurPrice` and sets `withLace: null` (`FE/components/ProductCard.tsx:91-103`). A one-size bag is ordered as "S", and the missing EUR price nulls the cart's EUR total in English (`AppContext.tsx:311-313`). Fix: use the product's first real size and EUR price, or send multi-option products to the product page.
- **Checkout: the Place order button is disabled with no explanation.** It disables while anything is invalid (`CheckoutPage.tsx:712`), so the helpful messages in `placeOrder()` (`:313-324`) can never appear. Field labels are placeholder-only (`CheckoutField.tsx:43-45`). Fix: keep the button enabled and show the first missing item on click.
- **Checkout: customers can see developer error text in English.** A timeout or network failure surfaces "The backend may be down — check Railway deploy logs" or "Check backend/CORS and retry" (`FE/api/client.ts:90-92`, shown via `CheckoutPage.tsx:360`). Server validation messages are English-only too (`OrdersController.cs:218-339`). Fix: map to localized, customer-safe messages.
- **Checkout: a retry can create a duplicate order.** The request times out at 20 s (`client.ts:86`) and `CreateOrder` has no idempotency key. This is an inference from code, not reproduced. Fix: send a client-generated order key and dedupe on the server.
- **Post-purchase: guests have no way to follow their order.** The confirmation's only link is "View in account" (`CheckoutPage.tsx:760-767`) and the email button goes to `/account` (`OrdersController.cs:993-996`); both hit a sign-in wall. Tracking endpoints require login (`OrdersController.cs:62-63, 108-109`), and guest orders are stored with `CustomerId = null` and never linked on later registration (`GuestEmail` is only read for emails and reports). Fix: a signed order-status link in the email, and attach guest orders by email at registration.
- **English locale leads to an order the visitor cannot place.** `/en` shows € prices, but delivery is Nova Poshta in Ukraine only, names must be Cyrillic (`CheckoutPage.tsx:23-26, 254-259`) and the phone is fixed to +380. None of this is stated before checkout. Product names, descriptions and categories stay Ukrainian on `/en` (seen live). Fix: say "Ships within Ukraine" up front, or add international shipping.
- **English home copy contradicts the product.** Live `/en` says yarns come from "family mills in the Scottish Highlands, the Peruvian altiplano…" and "Gentle wool washing", beside "100% cotton" bags (`en.ts:67, 101`). Unused strings also claim "Crafted since 2011" and "Carbon neutral" (`en.ts:48-57`) against "founded in 2025" (`en.ts:405`). Fix: rewrite to the real story and delete the unused claims.

**Medium**
- **Product page (mobile): Add to bag is not sticky and starts below the fold.** Measured live at y≈879 on an 812 px viewport, `position: static` (`MobileProductDetailView.tsx:841-866`). Fix: a sticky bar with price and CTA.
- **Product page (mobile): description, composition and care are collapsed by default** (`MobileProductDetailView.tsx:88, 420-448`). Fix: show the composition line and first sentences open.
- **Product page: no image zoom** on desktop; main image is a plain crossfade (`ProductDetail.tsx:350-357`). Fix: click-to-zoom or lightbox.
- **Stock: there is no availability concept.** No stock field on the storefront, no server stock check (`OrdersController.cs:338-339` only checks active/void), no "notify me". Acceptable for made-to-order, but then say so with a lead time. An inactive product in a saved cart fails the whole order with an English "Product 'X' is not available". Fix: validate the cart on checkout load and offer to remove the line.
- **Cart: the price can differ from the order.** The cart stores the price at add time indefinitely (`AppContext.tsx:85, 310`), while the server charges the current price. The pre-submit total can be stale, with no warning. Fix: refresh cart prices when the drawer or checkout opens.
- **Cart: thin on information.** No promo code field anywhere, no cross-sell, size and colour cannot be edited (only quantity and remove, `FE/components/CartDrawer.tsx:176-208`), no quantity cap (`CreateOrderItemRequest.cs:11` allows up to int.MaxValue). The drawer shows colour and size in English on the Ukrainian site ("Pink · Розмір One Size", seen live; `CartDrawer.tsx:164-167` ignores `colorUk`/`sizeUk`). Fix: use the localized names and state delivery terms in the drawer.
- **Checkout: geolocation prompt plus up to 5 s of "Loading branches…"** before the picker appears if the prompt is ignored (`FE/components/NovaPoshtaPicker.tsx:12, 161-180`); I observed about 5–8 s live. Branch or postomat only; no courier-to-address option. Fix: load the widget immediately and ask for location only on demand.
- **Checkout: no consent or legal line, no security cue, no link to terms or returns** on the checkout page (`CheckoutPage.tsx`, whole file). Fix: one line with links under the button.
- **Confirmation is minimal.** Order number, date, status and item count only (`CheckoutPage.tsx:722-768`). No "what happens next", payment instructions, delivery point recap, lead time or note that an email was sent; there is no distinct URL either. Fix: add next steps and the email address used.
- **Emails are Ukrainian-only** regardless of the order's locale (`OrderConfirmationEmailBuilder.cs:11-41`), and use a 900 px, 10-column table that will be hard to read on phones (inference; `:79, 108-121`). The send is fire-and-forget with no retry (`OrdersController.cs:916-950`). Fix: localize, use a stacked mobile layout, queue with retry.
- **Trust: no privacy policy page.** The login modal says "you agree to our Terms and Privacy Policy" as plain text with no links (`FE/components/LoginModal.tsx:535`); routes have terms and delivery only (`FE/routes.tsx:88-95`). Fix: add the page and link it.
- **Trust: no company identity.** No legal entity, FOP/EDRPOU or address in the footer or terms, and terms are generic ("laws applicable where Yarné operates", `en.ts:434`). The footer "Contact" is a bare mailto although a phone number exists in `contactContent.ts:27-28`. Fix: add seller details and a contact page with phone, hours and Instagram.
- **Policy contradictions.** Home says "Free returns… we collect it at our cost" (`en.ts:102`), the delivery page says email us within 14 days, and terms say personalised goods may be excluded (`en.ts:431`) while everything is made to order. Fix: one consistent returns statement.
- **Account: profile save is fake.** "Save changes" only flashes "Saved!" (`AccountPage.tsx:371-374`); phone and address start empty and email preferences are static ticks (`:664-665`). There is no password reset endpoint (`BE/Controllers/AuthController.cs` has me, logout, refresh, register, login, google, apple). Fix: implement or remove.

**Low**
- **"Please select a size" is unreachable**, because the first size is always preselected (`ProductDetail.tsx:148, 234-238`). Harmless for one-size bags, risky if multi-size items sell.
- **Related products heading is "Complete the wardrobe"** for bags (`en.ts:138`).
- **The email date uses the server's time zone** (`OrderConfirmationEmailBuilder.cs:26`).
- **Hashed assets are cached for 4 h** rather than immutable (live header `max-age=14400`).
- **No error boundary** in routes; a render error gives a blank page (grep found none).

#### What needs to be added
- **Tracking.** GA4 (or similar) with `view_item_list`, `view_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `add_shipping_info` and `purchase` (order id, value, UAH), plus search and form-error events. Add Meta and TikTok pixels if ads run on Instagram/TikTok. This needs a consent banner and a privacy/cookie page first. Natural hook points: `addToCart` (`AppContext.tsx:326`), the checkout mount, and `setPlacedOrder` (`CheckoutPage.tsx:354`).
- **Payment.** A stated method at minimum; ideally a Ukrainian provider (card, Apple Pay, Google Pay) and/or explicit pay-on-pickup.
- **Real policy pages.** Delivery and returns, privacy, seller details, and a contact page.
- **Product page content.** Dimensions/size guide, production lead time, a delivery/returns/payment summary, reviews or customer photos, and a sticky mobile CTA.
- **Working search.**
- **Lead capture and retention.** None exists today: no newsletter signup, wishlist, back-in-stock or abandoned-cart recovery (grep found nothing). Email is captured only at order time.
- **Guest order-status link**, a fuller confirmation, localized mobile-friendly emails, and a post-delivery review request.
- **Promo codes**, if campaigns are planned.

#### Cross-cutting notes
**SEO**
- Live pages have no JSON-LD (0 `ld+json` scripts), so no Product, Offer or Breadcrumb rich results; with no reviews there is no rating schema either.
- It is a client-rendered SPA, and `YarneFront/index.html` has a static `<title>Yarné</title>`. Whether crawlers see per-product meta was not verified.
- `/en` product pages serve Ukrainian names, descriptions and categories: mixed-language pages.
- The mobile description is in a collapsed accordion, so the composition and care text is hidden on first view.
- "The Knit Gallery", "knitwear" and "cashmere" wording (`en.ts:28-29, 288-290`; live meta description "Handmade knitwear, made to order.") does not match a bag catalogue.

**Design and copy**
- CTA labels are inconsistent: Quick Add / Add / Add to Bag / "Your Bag" on a site that sells bags.
- Checkout fields rely on placeholders as labels.
- The disabled Place order button is styled at 60% opacity with no reason given.
- The checkout title is "Review your order" although it is the data-entry step.

**Speed**
- The main JS bundle is 778 KB uncompressed and CSS 170 KB (live, served zstd-compressed), with 9 font files.
- Home, collection and product ship in the main bundle by design (`routes.tsx:63-66`).
- No field timing was measured.

#### Not verified
- **Actual order submission, confirmation screen, emails and admin flow.** Not submitted on live by instruction; traced from code only.
- **Whether email sending is configured in production** (Resend/SMTP env vars) and whether `hello@yarne.acc` receives mail.
- **How customers are actually charged today** (manager call, IBAN, cash on delivery); nothing in code or on the site says.
- **Quick add's wrong size on live.** Verified in worktree code only.
- **The duplicate-order race.** Inferred from the timeout and absence of idempotency.
- **Real load performance** (LCP, time to interactive on mobile networks). My session was warm-cached and LCP was not captured.
- **Real-device behaviour** of iOS Safari and Android (sticky sheet, keyboard overlap); only viewport emulation was used.
- **Logged-in flows** (account, tracking, prefilled checkout). No account was created; code only.
- **Whether the collection shows all products on desktop.** Only 3 product links were in the accessibility tree at first paint; I did not scroll.

---

### 6.3 UI, UX, copy, design system, accessibility

### Yarné storefront audit: UI, UX, copy, design system, accessibility

Repo root for all paths below: `C:\Users\maxmoroz\Desktop\YarneApp\.claude\worktrees\website-seo-design-conversion-02d75b\` (paths are given relative to `YarneFront/src/app/` unless they start with `YarneFront/`). Nothing in the project was edited or committed.

#### How I tested

- **Code:** read Header, Footer, Root, Home, Collection, ProductCard, ProductDetail, CartDrawer, CheckoutPage, CheckoutField, CarePage, careUi, NotFound and theme.css in full; LoginModal in part. MobileProductDetailView, AccountPage, WhyYarneSection, FeaturedShowcase, BestSellersCarousel, CareGuidePanel, NovaPoshtaPicker, fonts.css and both locale files were only grepped.
- **Rendered:** the local dev server could not start (no `node_modules` in the worktree; I did not install). I audited production `https://yarne-acc.com` (domain from root `index.html`) at 1440x900 and 375x812.
- **Pages rendered:** home, collection, product (`/uk/product/YRN-539393`), mobile menu, empty cart drawer, empty checkout, login modal, care landing, care request, 404, `/en/collection?filter=new`.
- **Production is one commit ahead of this branch.** `main` is at 14eeaee6, which adds the header Care link, a translated 404 and a footer Contact link pointing to the care request page. Findings marked "branch only" are already fixed there.
- **Not done on the live site:** no forms submitted, nothing added to cart, no sign-in.
- **Design notes:** `guidelines/Guidelines.md` is the empty Figma template, and `wowFactor.md`, `cursor.md` and `README.md` hold no visual direction. I judged against the brand as built: cream `#F5F2ED`, ink `#2D241E`, maroon `#4A0E0E`, Cormorant Garamond + DM Sans, pill buttons, large radii.
- **Contrast:** ratios are computed from the actual hex values, with alpha composited on the stated background.

#### What is right

- **Brand coherence:** three colours carry about 85% of colour usage (`#2D241E` 440 uses, `#F5F2ED` 91, `#4A0E0E` 79). Base pairs are strong: ink on cream 13.6:1, cream on ink 13.6:1, white on maroon 15.4:1.
- **Hero:** fits the viewport with both CTAs visible at 1440x900 (CTA bottom at 820px). There is one clear primary (filled) and one secondary (outline) (`pages/Home.tsx:125-141`). Desktop nav sits on one line.
- **Product page, desktop:** the buy box (price, colour, size, Add) is above the fold (button bottom at 685px of 900) and the info column is sticky (`pages/ProductDetail.tsx:405-441`).
- **Viewport handling:** uses `--app-svh` and `--browser-bar-b` instead of `100vh` (`YarneFront/src/styles/theme.css:16-21, 291-305`). No horizontal overflow at 375px on any page tested (scrollWidth 375).
- **Care pages are the best-built surface:**
  - shared constants `PILL`, `PILL_INK`, `FOCUS_RING`, `LABEL`, `EYEBROW` (`components/care/careUi.tsx:8-60`);
  - body text at ink/72 (5.7:1);
  - no interactive element under 44px on the mobile care landing (measured);
  - labelled combobox search, and a dialog with Escape and Tab handling (`components/care/CareGuidePanel.tsx:171-192, 240-243`);
  - own page titles.
- **Checkout form details:**
  - 16px inputs to avoid iOS zoom, correct `autoComplete` and `inputMode`;
  - errors on blur or after a typing pause;
  - `aria-invalid` plus a screen-reader error text (`components/CheckoutField.tsx:74-116`);
  - session-persisted fields (`pages/CheckoutPage.tsx:131-136`);
  - receipt announced with `role="status"` (`:727`);
  - shipping estimate labelled "paid to Nova Poshta on pickup".
- **Loading without layout shift:** collection skeletons match card dimensions (`pages/Collection.tsx:20-42`), and the piece-count line reserves its space (`:198-206`).
- **Motion:** 23 of 29 motion-using files handle reduced motion. Route, crossfade and image fades are compositor-only CSS with reduced-motion overrides (`theme.css:335-399`). Scroll listeners are passive, and Root's is rAF-throttled (`pages/Root.tsx:193-201`).
- **Navigation is real links:** nav, product cards, footer and care tiles are `<a href>` via `LangLink`. No clickable `div`/`span` found in the storefront.
- **Semantics:** one `header`, `nav`, `main`, `footer` per page. `html lang` follows the locale (`pages/Root.tsx:45-52`, verified `uk`/`en`). All rendered images have alt attributes.
- **i18n parity:** 438 en keys, all present in uk. The 18 extra uk keys are legitimate `_few`/`_many` plurals. No `t()` call references a missing key.
- **Empty states exist** for the cart drawer, checkout, collection, account orders and product not found.

#### What is wrong

##### Critical

- **Contact email looks undeliverable (care request page, footer, care bands).** `hello@yarne.acc` is hardcoded at `components/Footer.tsx:69` and `components/care/careUi.tsx:54`, and is rendered large on production `/uk/pages/care/request`. `.acc` is not a TLD I know of (the site is `yarne-acc.com`; `yarne.acc` is the Instagram handle). The whole care/guarantee flow funnels into this address. Fix: confirm the real mailbox and move it to one config value.
- **Quick Add puts an unselected variant in the cart (product card).** It hardcodes `size: "S"` and `withLace: null`, and omits `eurPrice` (`components/ProductCard.tsx:91-103`). The cart's EUR total becomes null when any item lacks a EUR price (`context/AppContext.tsx:52-53`), and the order is sent with `sizeName: "S"` even for one-size products (`pages/CheckoutPage.tsx:350`). Fix: use the product's default size and price data, or route to the product page when options exist.

##### High

- **Low-contrast text is systemic.** About 94 Tailwind text classes at or below ink/62 fail 4.5:1 on cream:

  | Class | Ratio on cream | Uses |
  |---|---|---|
  | `text-[#2D241E]/60` | 3.98:1 | 10 |
  | `/55` | 3.46:1 | 12 |
  | `/50` | 3.01:1 | 23 |
  | `/45` | 2.64:1 | 21 |
  | `/40` | 2.33:1 | 19 |
  | `/35` | 2.07:1 | 4 |

  Examples: footer links at /55 (`components/Footer.tsx:28`), footer tagline at /40 (`:88`), copyright at /35 (`:147`), card colour name at /40 (`components/ProductCard.tsx:309`), product-page description at /60 and labels at /45 (`pages/ProductDetail.tsx:429, 447`), collection count at /50 (`pages/Collection.tsx:194`), login labels at /55 and legal text at /40 (`components/LoginModal.tsx:44, 529`). Many of these are also 10–11px (68 uses of text at or below 11px). Fix: floor secondary text at ink/72, as the care pages already do.
- **Keyboard focus is effectively invisible site-wide.** `* { outline-ring/50 }` (`theme.css:147`) computes to `auto oklab(0.708 0 0 / 0.5) 1px` (measured on production), about 1.5:1 on cream. Custom rings use ink/35–40 (2.1–2.3:1; `careUi.tsx:11`, `ProductDetail.tsx:478, 639, 693`). Checkout inputs have `outline-none` and no focus style at all (`components/CheckoutField.tsx:95`). The header search input and the collection sort select also remove the outline (`Header.tsx:452`, `Collection.tsx:239`). Fix: one global `:focus-visible` ring in solid ink (and cream on dark surfaces).
- **Mobile menu is not a dialog** (`components/Header.tsx:343-415`). Verified on production: no `role` or `aria-modal`, focus stays on the hamburger behind it, Escape does not close it, the page behind still scrolls. The close button is 22x22px and nav links are 17px tall. It also offers no account, cart, search or help links. Fix: use the existing Radix Sheet/Dialog primitive and give rows a 44px minimum height.
- **Cart drawer is not a dialog** (`components/CartDrawer.tsx:54-66`). Verified: no `role="dialog"`, focus not moved in, Escape does not close. Quantity buttons have no `aria-label` and are 24px (`:177-194`). The remove control is a 14px icon (`:204-210`). Fix: same dialog primitive, labelled 44px controls.
- **Login modal does not trap focus** (`components/LoginModal.tsx:218-224`). Verified: Tab moves focus to the footer behind the modal. Focus is not returned on close. Fix: use Radix Dialog.
- **Collection filter bar never sticks.** `<main>` has `overflowX: "hidden"` (`pages/Collection.tsx:162`), which makes it a scroll container, so `md:sticky` at `:212` is inert. Measured: after scrolling 900px the bar's top is at −580px. Home.tsx:55-56 documents this exact trap. Fix: `overflow-x: clip`.
- **Collection controls are off-screen on phones.** The bar's content is 601px wide in a 375px viewport with a hidden scrollbar (`pages/Collection.tsx:214`). The Filter button sits at x=578, and Sort is cut at x=349. The Filter button also has no accessible name below `sm`, because its label is `hidden sm:inline` (`:247-255`). Fix: put Sort and Filter on their own row or pin them right, and add `aria-label` and `aria-expanded`.
- **Product cards need two taps on touch.** The first tap is cancelled to reveal Quick Add; only the second navigates (`components/ProductCard.tsx:120-131`). Fix: navigate on the first tap and show Quick Add as a persistent small button.
- **Place order is disabled with no explanation.** The button is disabled until every field is valid (`pages/CheckoutPage.tsx:712`), so the summary messages at `:313-323` can never show. Fix: keep it enabled, validate on click and focus the first invalid field.
- **English checkout has hidden constraints.** Names must be Cyrillic (`pages/CheckoutPage.tsx:245-258`; en copy "Cyrillic letters only"), the phone is fixed to +380, and delivery is Nova Poshta only, while `/en` shows EUR prices. No page says "Ukraine delivery only" before checkout. Fix: state the delivery region and payment method on the product page and cart, or relax the rules for `/en`. (That this blocks real customers is my inference.)
- **Size guide is a dead control.** The button has no `onClick` (`pages/ProductDetail.tsx:619-625`; also `components/MobileProductDetailView.tsx:752-755`). It is rendered even on one-size products (seen on production). Fix: wire it up or remove it.
- **Search is non-functional.** The overlay input has no submit handler or results (`components/Header.tsx:417-459`) and no label. Its close button reuses the "Close menu" label (`:431`). There is no Escape handling or focus trap, and no search on mobile at all. The placeholder reads "Cashmere, turtleneck, bouclé..." (`i18n/locales/en.ts:29`, `uk.ts:29`) in a store selling bags. Fix: implement it or remove the icon.
- **Legal copy without links.** "By continuing, you agree to our Terms and Privacy Policy" is plain text (`components/LoginModal.tsx:529-533`; verified zero links in the dialog). No privacy route exists in `routes.tsx`. Fix: link Terms and add a privacy page.

##### Medium

- **Scroll position leaks across routes on a fresh page load.** Verified twice: opening `/uk/collection` by URL landed scrolled down; sessionStorage held `"entry:default":900`. Cause, from code: React Router's first entry has key `default` and type POP, and `resolveScrollPosition` prefers the entry key over the route (`utils/scrollRestoration.ts:168-179`, `pages/Root.tsx:149-161`). Fix: skip restore on the initial load unless the navigation type is `back_forward`.
- **"Add to bag" is exactly at the fold on a 375x812 phone** (button top at 812px) with no sticky add bar (`components/MobileProductDetailView.tsx:843`).
- **Small tap targets.** Measured:
  - desktop header icons 20x20 (`Header.tsx:249-336`); language buttons 30x20; mobile language toggle 42x32 (`:162`);
  - card swatches 14–18px (`ProductCard.tsx:293-294`); product-page swatches 23–30px;
  - gallery dots 6x6 and 18x6; mobile "Description" toggle 15px tall; "Size guide" 17px;
  - login close 36px and password toggle 32px (`LoginModal.tsx:241`).
- **Invalid nesting.** Swatch and Quick Add `<button>`s sit inside the card `<a>` (`ProductCard.tsx:229-243, 283-302, 338-344`). Fix: make the image and title the link, with the buttons as siblings.
- **Missing state attributes.**
  - Collection tabs and availability chips have no `aria-pressed` or `aria-current` (`Collection.tsx:217-231, 305-319`).
  - Sort `<select>` has no label (`:236`); the price range input has no label (`:279`).
  - Desktop details accordion has no `aria-expanded` (`ProductDetail.tsx:720`).
  - The mobile language listbox wraps buttons in `role="option"` with `aria-selected={false}` (`Header.tsx:184-211`).
- **Collection tab state is wrong for New Arrivals.** `/collection?filter=new` highlights "All Pieces" (verified; `Collection.tsx:59`). The filter panel's exit animation never plays because there is no `AnimatePresence` (`:259-264`). The price filter only sets a maximum.
- **API failure looks like an empty catalogue.** `useProducts` exposes `error` (`hooks/useProducts.ts:214`) but Collection only reads `products` and `loading` (`pages/Collection.tsx:79`), so an outage shows "No pieces found" with no retry. The empty state has no "clear filters" action (`:355-367`).
- **Product page loading state is a blank half-screen** (`pages/ProductDetail.tsx:273-275`); there is no skeleton.
- **Checkout labels are placeholders.** The real `<label>`s are `sr-only` (`components/CheckoutField.tsx:43`), so the visible label disappears on input. The summary error is not `role="alert"` (`pages/CheckoutPage.tsx:705-709`). No payment method is stated anywhere near Place order (`:747` comment).
- **Misleading cart copy.** "Shipping & taxes calculated at checkout" (`i18n/locales/en.ts:156`, `uk.ts:158`) is wrong: checkout adds no tax, and shipping is paid to the carrier on pickup.
- **Inconsistent terminology and casing (EN).**
  - "Add to Bag" / "Your Bag" / "Your bag is empty" versus header "Cart". "Bag" is also ambiguous in a store selling bags; uk uses "кошик" throughout.
  - "Sign in" (`:23`) versus "Sign In" (`:249`); "View All" (`:7`) versus "View all" (`:326`).
  - Title Case "Proceed to Checkout", "Go Shopping", "Delivery & Returns" versus sentence case "Place order", "Guarantee terms", "Request care".
  - Two different empty-cart subtitles (`:152`, `:167`).
- **Catalogue data is not localised in EN.** `/en` cards show the Ukrainian subtitle "трикотажна пряжа (100%-бавовна)" (verified; `ProductCard.tsx:264` has no localised variant).
- **Hardcoded English in alt text.** `${product.name} in ${colour}` renders as "Chérie in Рожевий" on `/uk` (`ProductCard.tsx:186`). Also "Yarné Hero" (`Home.tsx:85`) and "Error loading image" (`components/figma/ImageWithFallback.tsx:139`). Thumbnail alts are just "colour - n" (`ProductDetail.tsx:327, 396`).
- **404 is hardcoded English and links to an unprefixed `/`** (`pages/NotFound.tsx:25-38`). Branch only; `main` uses `notFound.*` keys.
- **Home story section clips its headline word.** "Пляжний костюм" is cut off at both 1440px and 375px (screenshots). Sizing is in `components/WhyYarneSection.tsx:462-464, 728-735`. Fix: fit to the longest label or allow a wrap.
- **Home heading outline.** Production shows one empty `<h2>` and the Featured Showcase `<h3>`s duplicated (both breakpoint variants mounted; `components/FeaturedShowcase.tsx:178, 282, 496`).
- **Design system is not tokenised.**
  - 720 hardcoded hex occurrences (35 distinct) in storefront files, plus about 40 distinct `rgba()` values; zero uses of the token classes (`bg-primary`, `text-muted-foreground` and so on).
  - `theme.css:22-58` still holds shadcn defaults (`--primary: #030213`, `--background: #fff`) that are unrelated to the brand. `components/ui/sonner.tsx:5-10` says so explicitly.
  - The cream background is hardcoded twice in `theme.css:155, 170`.
- **Typography scale has sprawled.**
  - About 40 distinct arbitrary `text-[…]` sizes (including 9.5, 10, 10.5, 11, 11.5, 12.5, 13, 13.5, 14.5, 15, 15.5, 16.5px) plus about 30 distinct inline `fontSize` values.
  - Font family is set inline 232 times.
  - Four families are loaded. Prata and Archivo are used only in `components/WhyYarneSection.tsx:50-51`. That reads as a second type system on the home page; whether it is intended is unknown.
  - The login modal renders the wordmark as Cormorant text instead of `<Logo>` (`components/LoginModal.tsx:~251-256`).
- **Radius, button and badge variants are ad hoc.**
  - Radii seen: 12, 14, 16, 18, 20, 22, 24, 26, 27, 28, 32px, 2rem, 2.5rem, plus `rounded-2xl` and `rounded-3xl`.
  - The primary button is hand-rebuilt on each surface with heights of 46, 48, 50, 52 and 54px and letter-spacing from 0.1 to 0.16em (`CartDrawer.tsx:243`, `ProductDetail.tsx:693`, `CheckoutPage.tsx:713`, `LoginModal.tsx` submit, `Home.tsx:128`, `careUi.tsx:59`).
  - The "New" badge is maroon on cards (`ProductCard.tsx:200-210`) and white on the product page (`ProductDetail.tsx:362-367`).
  - The hover colour of the primary button differs: opacity-90 in most places, opacity-85 on care pills.
- **Dead dependencies and components.**
  - `@mui/material`, `@mui/icons-material`, `@emotion/*`, `react-slick`, `react-responsive-masonry`, `next-themes`, `react-popper` and `@popperjs/core` have zero imports in `src`.
  - Of 46 files in `components/ui`, only `skeleton` and `sonner` are imported, so the Radix, cmdk, vaul and react-day-picker dependencies behind the rest are unused. Meanwhile dialogs and drawers are hand-rolled without focus management.
  - Icons are consistent in practice: lucide only, plus a few inline SVGs.
- **Duplicated DOM per breakpoint.**
  - Collection renders every product twice, in a desktop and a mobile grid (`pages/Collection.tsx:370-379`; 18 cards in the DOM, 9 visible).
  - The product page mounts both the mobile and desktop layouts, so there are two `<h1>` elements (`pages/ProductDetail.tsx:277, 303`; verified, one hidden).
  - Fix: one responsive grid, and render by media query.
- **Reduced motion is not honoured** in `components/Header.tsx` (menu slide and stagger), `components/CartDrawer.tsx`, `pages/Collection.tsx`, `pages/AccountPage.tsx`, `pages/NotFound.tsx` and `i18n/LanguageSwitcher.tsx`.
- **Layout-property animation.** `height: "auto"` is animated at `Collection.tsx:262`, `AccountPage.tsx:209` and `ProductDetail.tsx:736`. The desktop gallery springs `height` on every resize tick (`ProductDetail.tsx:343-347`). `backdrop-filter` is transitioned on the header (`Header.tsx:112-120`).

##### Low

- `LoginModal.tsx:224` uses raw `100svh`, against the project's own rule (`theme.css:17-20`).
- "Skip to content" link is missing (verified).
- Footer `mt-32` leaves a 128px cream gap above the footer on every page (`components/Footer.tsx:81`). Footer column titles are `<p>`, not headings (`:98`).
- Carousel dots use a hardcoded English label, "Go to slide n" (`components/BestSellersCarousel.tsx:307`).
- Product names on cards are `<p>`, not headings (`ProductCard.tsx:249`).
- The cart count badge is not announced (no `aria-live` and no count in the button label; `Header.tsx:300-316`).
- The product-page Back button uses `navigate(-1)` (`ProductDetail.tsx:306`), which leaves the site for visitors who landed directly.
- Unused locale keys: `header.journal`, `header.about`, `footer.legal.privacy`, `footer.legal.cookies`.
- Content typo on production home: "сторювати" should be "створювати". It is not in the locale files, so it comes from admin-entered content.
- The hero H1 on `/uk` is English ("Your unique bag, ma chérie!"). This is admin-entered copy; confirm it is intended.

#### What needs to be added

- **Brand tokens** in `theme.css`: ink, cream, sand `#EDE9E2`, maroon, success, error and the text-opacity steps, mapped onto the existing shadcn names so `bg-primary` and `text-muted-foreground` mean something.
- **A type scale and a radius scale**, and font-family utilities to replace the inline styles.
- **One Button component** (primary, secondary, on-dark, link; sizes; loading and disabled) and one Badge. `careUi.tsx` `PILL*` is the natural seed.
- **One accessible Dialog/Sheet** (focus trap, Escape, focus return, scroll lock) for the mobile menu, cart, search and login. The Radix primitives are already in the repo.
- **A global `:focus-visible` style** and a skip link.
- **Missing states:**
  - API-error state with retry (collection, product, home sections);
  - product-page skeleton;
  - "clear filters" in the empty collection;
  - out-of-stock or made-to-order lead time on the product page (I did not check the product or stock types);
  - a visible reason when Place order is unavailable.
- **Product-page microcopy** near the price: delivery region and carrier, who pays shipping, production time, returns link, payment method.
- **Forgot-password path** (none found), a privacy policy page, and real Terms links.
- **Working search**, including on mobile, or remove it.
- **Dark mode decision.** `next-themes` is installed but never imported; there is no ThemeProvider. The `.dark` tokens (`theme.css:61-96`) and `dark:` classes exist only in unused `components/ui` files, and the storefront hardcodes hex. It is not half-wired, it is unwired. Either remove the dependency and `.dark` block, or tokenise first.
- **Localised product subtitle and category**, and translated alt templates.
- **Per-page titles** for collection, checkout, account and 404 (all render as "Yarné").

#### Cross-cutting notes (SEO and conversion)

**SEO**
- Collection tabs are `<button>`s that call `setSearchParams` (`pages/Collection.tsx:217-231`). Collection pages are reachable as links only from the footer. Make the tabs `<a href>`.
- Meta is locale-blind and inconsistent. Production serves `Handmade knitwear, made to order.` as the description on `/uk`. There is no canonical, no hreflang, and no product JSON-LD (all verified). Root `index.html` and `YarneFront/index.html` disagree on title, description and `lang`.
- A client-rendered SPA with no prerender means crawlers depend on JS for all content. (Inference; I did not test crawler rendering.)
- The desktop details accordion mounts its content only on click (`pages/ProductDetail.tsx:732-763`), so producer and material details are absent from the DOM by default. The mobile description is collapsed but, from the code, stays in the DOM (`MobileProductDetailView.tsx:906-928`); I did not check this in the browser.
- Duplicate hidden product grids and duplicate `<h1>`/`<h3>` elements dilute the heading outline. The empty home `<h2>` adds to this.
- 404 pages have no distinct title or `noindex`. (Whether the server returns HTTP 200 for them was not checked.)

**Conversion**
- The two-tap card on mobile, the Quick Add default variant, the unexplained disabled Place order button, and the Cyrillic and +380 rules on `/en` are the main funnel risks.
- "Add to bag" sits below the fold on phones.
- There is no shipping, returns, payment or lead-time information before checkout, and the cart line about shipping and taxes is wrong.
- The dead Size guide link and the dead search erode trust.
- The contact address `hello@yarne.acc` needs confirming.
- The collection filter and sort controls are hidden off-screen on phones and are not sticky on desktop.

#### Not verified

- **This branch rendered locally.** No `node_modules`; everything rendered is production (`main`), so the header Care link, 404 and footer Contact differ from the branch.
- **Cart with items, filled checkout, order placement, account pages, registration, Google sign-in, NovaPoshtaPicker behaviour.** I did not add to cart, submit or sign in on the live site. Another browser tab in the same profile was in use on `/uk/checkout` with a cart item, so I worked in a separate tab and left `yarne.cart.v1` untouched. These surfaces were audited from code only.
- **Whether `hello@yarne.acc` actually bounces.** I did not look it up or send mail.
- **Real devices.** iOS Safari and in-app browser behaviour, touch gestures, the home story section's scroll feel, jank and frame rates. The 375px tests were desktop Chromium emulation, and one mobile screenshot of the collection page came back blank while the DOM was correct (tool artefact).
- **Screen reader output, 200% zoom and 320px reflow.**
- **Contrast of text over photos** (hero `text-white/65` and `/70` over the gradient, care tiles). It depends on the image.
- **Tablet breakpoints (768–1023px), CareGuidePanel and CarePiecePicker interaction, the Guarantee terms page, static delivery and terms pages, Our History.** Only grepped, or not opened.
- **Admin-entered content** beyond what happened to be on screen.
- **Clipboard note.** The browser tool reported a page-initiated clipboard write during one of my scripted clicks. I did not find the cause.
- **Scratch files.** I wrote two helper scripts and two JSON dumps to the OS temp folder, not the project.

---
