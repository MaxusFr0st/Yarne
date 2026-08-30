# Yarné — Wow-Factor Plan

Working plan for turning Yarné from "a working system" into a defensible
bachelor's thesis project.

## The premise

The code volume is already past the bar: ~450 source files, 21 API controllers,
a full accounting/ERP subsystem, JWT+OAuth, R2 storage, Nova Poshta, i18n.
Adding more CRUD features earns nothing.

What is missing is **evidence**. A thesis is graded on problem framing,
architecture rationale, and *measured* results. Right now there is no CI, six
test files, and zero performance numbers. Every item below is chosen because it
produces a chapter with a number in it.

**Framing to use throughout:** Yarné is a vertically integrated
production-to-sale system for a small textile manufacturer. The storefront is
one module. The ERP half (procurement, BOM, FIFO costing, production, returns)
is the differentiator — no other student project has it. Do not present this as
"an e-commerce site."

---

## Tier 1 — build these

### 1. Full-offline PWA with a durable outbox

**Status: attempted, built, verified, then reverted by the owner on
2026-08-30** — see the Implementation Plan's Steps 4/5 entries for the full
account. No longer part of the active build; kept here as the original
pitch, since the reasoning behind it (and why it turned out not worth
carrying forward independent of the picker work) may be worth revisiting
later with a different scope.

**Why it is wow:** open the site on a phone, switch to airplane mode, browse the
catalogue, add to cart, submit an order — then reconnect and watch it sync. That
demo lands in 30 seconds in a defense room.

**What already exists:**
- `YarneFront/public/sw.js` — app-shell precache + navigation fallback
- `YarneFront/public/manifest.webmanifest` — installable, correct icons
- `YarneFront/src/app/offline/expenseQueue.ts` — IndexedDB queue for one admin
  flow (operating expenses), syncs on `online` event
- `AdminOperatingExpensesView.tsx` — online/offline pill, sync notice

**What to build:**
1. Generalise `expenseQueue.ts` into `offline/outbox.ts` — same logic, but store
   name and payload type as parameters. The existing expense queue becomes its
   first consumer. Nearly a refactor.
2. Stale-while-revalidate caching in `sw.js` for `GET /api/products`,
   `/api/collections`, and product images, so the catalogue renders offline.
   Currently `/api/` is skipped entirely.
3. Offline cart + queued checkout as the second outbox consumer.
4. **Idempotency keys on order submission.** This is the part that makes it
   thesis-grade rather than a tutorial. A queued order that syncs twice (retry,
   double reconnect, two tabs) must not create two orders. Client generates a
   UUID per queued order; `OrdersController` rejects a duplicate key. Expect to
   be asked about this — it is the obvious attack on the whole design.
5. Background Sync API where supported, falling back to the existing `online`
   listener.
6. "New version available" toast via `registration.waiting`.

**How to measure:**
- Lighthouse PWA + performance score, before vs. after
- A capability matrix: what works offline before vs. after (catalogue / cart /
  checkout / expenses / admin)
- A deliberate double-sync test proving no duplicate orders

**Effort:** ~2 weeks. **Chapter:** offline-first architecture, eventual
consistency, conflict handling.

---

### 2. MRP — demand forecast to material requirements to purchase suggestions

**Why it is wow:** this is what SAP and Odoo do, and the schema already supports
it. It closes the loop between the storefront and the factory: sales history
predicts what gets sold, the BOM explodes that into yarn, stock is netted off,
and the system tells the owner what to buy and when. Nobody else defending this
year will have it.

**What already exists (this is the point — almost nothing is missing):**
- `ProductBom` / `ProductBomItem.QuantityRequired` — material per product
- `PurchaseOrderItem.QuantityRemaining` — live FIFO stock per lot
- `Material.ReorderThreshold` — reorder point already modelled
- `Order` / `OrderItem` with dates — the demand history
- `ProductionOrder` + `ProductionMaterialConsumption` — actual consumption

**What to build:**
1. `ForecastService` — per-product demand forecast from order history.
   Implement three: naive (last period), moving average, and exponential
   smoothing (Holt for trend). You need the baselines to have a results table.
2. BOM explosion: forecast quantity per product times `QuantityRequired` per
   material = gross material requirement.
3. Net off `QuantityRemaining` across open FIFO lots, apply supplier lead time,
   emit a suggested purchase order per material with an "order by" date.
4. One admin screen: suggestions list, each row with its reasoning
   (forecast, BOM, on-hand, suggested qty). Recharts is already installed.

**How to measure — this is the chapter:**
Backtest against the real order history. Hold out the last N months, forecast
them, compare to actual. Report MAPE (and RMSE) for each of the three methods
against the naive baseline. That is a genuine results table with real data from
a real business — not a toy dataset.

**Effort:** ~2-3 weeks. **Chapter:** forecasting methodology, MRP, evaluation
against baselines. Strongest single item in this plan.

---

### 3. CI, tests, and a measurement harness

**Why:** unglamorous, cheap, and the difference between a hobby project and an
engineering one. Also produces the graphs for the performance chapter.

**What to build:**
- GitHub Actions: `dotnet build` + `dotnet test` + frontend build on push.
  There is currently no `.github/workflows` at all.
- Raise test coverage on the parts that carry money: FIFO consumption, COGS
  calculation, return reversal, channel-fee allocation. These are the functions
  where a bug is expensive and a test is easy to justify in writing.
- A `k6` script hitting the product and order endpoints; record p50/p95/p99
  under load.
- Lighthouse CI with a budget, so the PWA numbers from item 1 stay honest.

**How to measure:** coverage % before/after (be honest — it starts at roughly
six test files), latency percentiles, Lighthouse scores over time.

**Effort:** ~2-3 days. Do this first; it produces the measuring instruments the
other chapters need.

---

## Tier 2 — if time allows

### 4. Hybrid recommender, evaluated against the existing manual baseline

`ProductRecommendation` already exists as an admin-curated list with
`SortOrder`, plus a `SuggestionsConfigured` flag. That hand-curated list is a
*free baseline to beat*, which is exactly what makes this measurable.

Build: item-item co-purchase from `OrderItem` history, plus a content-based
fallback on colour/size/collection for cold-start products.

Measure: precision@k and recall@k on held-out orders, hybrid vs. manual
curation vs. random. Cold-start handling is the standard critique — the
content-based fallback is the answer, so say so in the text.

**Effort:** ~2 weeks.

### 5. "One bag, fully traced" — end-to-end cost traceability view

Pick any sold item and show the whole chain: which yarn lots were consumed
(`ProductionMaterialConsumption` links to `PurchaseOrderItem`), from which
supplier at what price, plus labour, scrap, capitalized COGS, channel fee, and
the true margin after returns.

Every one of those fields already exists in the schema. This is one query and
one page, and it demos beautifully — it makes the ERP depth visible instantly to
someone who has been looking at the storefront and assuming it is just a shop.

**Effort:** ~3 days. Best effort-to-impression ratio in the plan.

---

## Explicitly not doing

Listing these matters — an examiner asks "why not microservices?" and
"we judged it unjustified for a single-operator business" is a better answer
than silence.

- **Microservices / Kubernetes** — one deployment, one team of one. Splitting it
  adds operational complexity with no load to justify it.
- **A chatbot / LLM feature** — bolted on, unmeasurable, and unrelated to the
  problem domain.
- **Blockchain anything** — no.
- **A native mobile app** — the PWA covers it, which is the whole argument of
  item 1.
- **Rewriting the frontend** — it works. Rewrites are invisible to grading.

---

## Sequence

| Order | Item | Effort | Produces |
|---|---|---|---|
| 1 | CI + measurement harness | 2-3 days | The instruments everything else is measured with |
| 2 | ~~Fix PWA login~~ | — | **RESOLVED 2026-08-30**, confirmed on real device — no longer blocks anything below |
| 3 | Traceability view (#5) | 3 days | Early demo win, low risk |
| 4 | BOM accuracy (A0.1) | 2 days | Honest consumption data for the forecast backtest |
| 5 | ~~Nova Poshta offline body~~ | — | **BUILT THEN REVERTED 2026-08-30** — owner decided against it, online picker untouched |
| 6 | ~~Full-offline PWA + offline orders~~ | — | **BUILT THEN REVERTED 2026-08-30**, alongside #5 |
| 6.5 | ~~Push notifications for synced orders~~ | — | Never built — depended on #6, moot once #6 was reverted |
| 7 | MRP forecasting (#2) | 2-3 weeks | The headline chapter, with MAPE table |
| 8 | Recommender (#4) | 2 weeks | Second evaluation chapter, only if time |

Items 5, 6, and 6.5 are no longer part of the active plan — see their entries
above for what was built, verified, and why it was reverted. 7 is independent
of that whole chain and remains the differentiator; it did not depend on any
of the reverted work and can proceed on its own.

If time gets short: drop 8. Do not drop 7.

## Before starting

Get the department's grading rubric. It decides whether they want research
contribution or engineering craft, and this plan currently assumes engineering
craft with two evaluated components bolted on. If the rubric weights research
heavily, promote #2 and #4 and cut #5's scope.

---

## Implementation plan

Concrete build steps for the Tier 1 items, in build order. All backend work
follows the codebase's existing conventions exactly (see
`iterative-foraging-tide.md`'s "Conventions" section): `sealed record` DTOs,
`AccountingBusinessException` for domain errors, `Serializable` transactions
with `FOR UPDATE` locks for anything touching FIFO lots, `IsVoid` soft-delete,
`IAdminActivityLogService.LogAsync("accounting", …)` on every mutation,
`AddScoped<IX, X>()` registration in `Program.cs`. No new language, no new
runtime, no gRPC (see decision below) — everything here is C# + the existing
React/TS frontend.

**Decided along the way, worth restating:** forecasting and the recommender
run entirely in C#/.NET, in-process. No Python service, no gRPC — the
algorithms involved (moving average, exponential smoothing, MAPE, cosine
similarity, precision@k) are all small enough to write directly against data
EF Core already has loaded, and a second service would add a deployment
target and a network hop for zero algorithmic benefit. Python's one legitimate
role is as an offline, unshipped notebook — pull order history to a
dataframe, backtest the forecasting methods, generate the MAPE table/chart
for the thesis results chapter. It never touches the running app.

### Step 0 — CI + measurement harness (2-3 days, do first)

- `.github/workflows/ci.yml` — two jobs: `dotnet build` + `dotnet test` on
  `YarneAPIBack.sln`; `npm ci && npm run build` in `YarneFront`. This repo has
  zero CI today, so this is the first commit here.
- `YarneBack/scripts/load-test.js` — a `k6` script hitting
  `GET /api/products`, `GET /api/collections`, and a sandboxed order create;
  record p50/p95/p99. Run manually for now, wire into CI later if useful.
- `.lighthouserc.json` + a Lighthouse CI step — baseline score before any PWA
  work starts, so Step 3's "before/after" numbers are honest.
- Coverage: add `coverlet.collector` to `YarneAPIBack.Tests.csproj` (if not
  already referenced), `dotnet test --collect:"XPlat Code Coverage"` in CI,
  upload as an artifact. Report the honest starting number — six test files —
  in the thesis rather than hiding it.

### Step 1 — BOM accuracy (prerequisite for Step 2's forecast quality)

Already fully speced in `iterative-foraging-tide.md`'s **A0.1** section:
actual-material-usage override on `CreateProductionOrderRequest` +
`CompleteProductionAsync`, and BOM edit history via void-and-insert in
`SaveBomAsync`. Not blocking for Step 2 to *start* — the forecast's material
requirement input is just "quantity per unit," and it doesn't care whether
that number comes from the nominal BOM or a usage-weighted average — but land
this before backtesting the forecast for real, since the backtest is only as
honest as the consumption data it reads.

### Step 2 — MRP forecasting (2-3 weeks, the headline chapter)

New folder `Accounting/Services/Forecasting/`:

- **`IForecastService` / `ForecastService.cs`** —
  `ForecastMonthlyDemandAsync(productId, method, horizonMonths)`, reading
  `OrderItem` grouped by month for that product. Implements three methods
  behind one enum-like string param (matches the module's "no C# enums,
  validated string" convention): `"naive"` (repeat last period),
  `"moving_average"` (configurable window), `"holt"` (double exponential
  smoothing, trend-aware). Each is 15-30 lines — no library needed.
- **`IMaterialRequirementService` / `MaterialRequirementService.cs`** — BOM
  explosion: forecasted quantity × `ProductBomItem.QuantityRequired` (or the
  Step 1 usage-weighted figure once it exists), summed per material across
  every product that uses it. Nets against on-hand stock, applies a
  per-supplier lead time, emits
  `MaterialSuggestionDto { MaterialId, MaterialName, OnHand, ForecastedNeed, SuggestedQuantity, OrderByDate, Reasoning }`
  — `Reasoning` is a plain string built from the actual numbers ("forecast
  120 units × 0.8m/unit − 40m on hand = 56m by Mar 15"), not a black box.

  **Sequencing note — checked against `iterative-foraging-tide.md`, doesn't
  need to wait.** That plan seeds exactly one warehouse and keeps warehouse UI
  hidden until a second exists, so nothing here needs to be warehouse-aware
  yet. Two adjustments made *now* so this doesn't need rework once that plan
  ships:
  - **Net stock as `SUM(PurchaseOrderItem.QuantityRemaining) WHERE MaterialId
    = X AND IsReceived = true`, not by joining through
    `PurchaseOrder.Status = 'received'`.** The join-based version would
    silently miss opening-balance lots (`PurchaseOrderId = NULL`) and
    transfer lots once A1/A4 land — `IsReceived` already exists on the lot
    itself for exactly this reason.
  - **Lead time needs a new field neither schema currently has**: nullable
    `Supplier.LeadTimeDays`. Land it in the same migration as
    `iterative-foraging-tide.md`'s A6 `Supplier` field additions
    (`Email`/`PhoneNumber`/`Address`/`Website`/`TaxId`) rather than a separate
    one.
  - The BOM-quantity input is already written as a swappable value, not
    hardcoded logic — upgrading it to the Step 1 usage-weighted figure once
    that lands is a one-line change here, not a rework.
- DTOs in `Accounting/DTOs/ForecastDtos.cs`:
  `ForecastPointDto(DateTime Month, decimal PredictedQuantity)`,
  `MaterialSuggestionDto(...)` as above.
- **`AccountingForecastController`** — `[Authorize(Roles = "Admin")]`, same
  shape as `AccountingOperatingExpensesController`:
  `GET api/accounting/forecast/products/{id}?method=holt&months=3`,
  `GET api/accounting/forecast/material-suggestions`.
- **Evaluation (not shipped)** — a small export endpoint or a one-off
  `dotnet run -- export-orders > orders.csv` reading `OrderItem` directly via
  EF Core, no new infra. Feed that CSV into the Python backtest notebook from
  the decision above: hold out the last N months, compare naive vs. moving
  average vs. Holt, report MAPE/RMSE against the naive baseline. That table is
  the results chapter.
- **Frontend** — `AdminMaterialForecastView.tsx` in
  `src/app/components/admin/`, new sub-tab alongside the existing accounting
  views. One table (Material / On-hand / Forecasted need / Suggested qty /
  Order-by date, `Reasoning` as a hover tooltip) plus a Recharts line chart of
  the demand curve per product. Reuse `accountingAdminUi.tsx` primitives
  (`KpiCard`, `TableHeader`, etc.) rather than building new ones.

### Step 2.5 — Update-available toast (DONE, shipped 2026-08-30, bumped ahead of schedule)

Originally scheduled inside Step 5, moved up and shipped immediately after a
real incident: a login bug had already been fixed in an earlier commit, but
an installed PWA kept serving the JS bundle from whatever day it was first
opened — `self.skipWaiting()` in `sw.js`'s `install` handler forced every new
deploy to silently take over with zero notice, and an iOS PWA that's merely
*resumed* from background suspension (not relaunched) never re-fetches
`index.html` on its own, so the stale bundle could persist indefinitely.

**Shipped:**
- `sw.js` — removed the automatic `self.skipWaiting()`; a new version now
  installs but waits for the page to explicitly ask it to activate. Added a
  `message` listener for `{type: "SKIP_WAITING"}`.
- `src/app/offline/swUpdate.ts` — watches the registration for
  `updatefound`/`installed`, and shows a persistent toast ("A new version of
  Yarné is available" + Refresh action) via `sonner` when an update is
  waiting behind an already-running session. Clicking Refresh posts
  `SKIP_WAITING` to the new worker; `controllerchange` triggers one reload.
- `src/main.tsx` — wires the watcher in on the existing PROD service-worker
  registration path.
- `src/app/pages/Root.tsx` — mounted `<Toaster />` (the `sonner` wrapper in
  `components/ui/sonner.tsx` existed but was never rendered anywhere —
  needed to actually see any toast, including this one).

Verified: `npm run build` succeeds. Not yet verified on a real device across
an actual deploy (do that once this ships).

### Step 3 — PWA login (RESOLVED 2026-08-30, confirmed on real device, no longer blocks Step 5)

**Status: login works on a real iPhone, confirmed by the owner directly —
password and Google both.** Kept as documentation because the diagnosis
process is worth having on record, but flagged honestly: **this was not fixed
by a code change.** Two theories were investigated below; real-device testing
disproved the cookie theory outright (Google login worked in the PWA, which
uses the identical `SetSessionCookies` call the password path does — so
third-party cookies were never actually being blocked). The most likely real
explanation, traced from git history: the Step 2.5 icon-swap commit bumped
`sw.js`'s `CACHE_VERSION`, which forced an old, possibly-already-fixed cached
JS bundle to finally be discarded on next launch — see the note under Step
2.5 for the full trace. In other words: probably never a bug in currently
deployed code, just a stale bundle stuck on one device, incidentally flushed
by an unrelated change. The diagnosis below stays because the underlying
mechanisms it documents (third-party cookies, the Google popup flow) are real
and worth understanding even though neither turned out to be the live cause
this time.

**Two independent causes were investigated:**

**Cause 1 — the auth cookie is a third-party cookie.** The storefront and the
API are on *different origins* (`resolveApiBase()` in
`YarneFront/src/app/api/base.ts` returns `VITE_API_URL`, the Railway API host;
`Program.cs:198-226` configures CORS with `.AllowCredentials()`). So
`AuthCookie` (`Auth/AuthCookie.cs`) ships `SameSite=None; Secure;
Partitioned` — a cross-site cookie. Installed PWAs, iOS standalone mode in
particular, block third-party cookies outright; Safari's ITP does not honour
CHIPS/`Partitioned` the way Chromium does. Result: the login POST succeeds,
the `Set-Cookie` is dropped by the browser, and the very next request is
anonymous again — which reads to the user as "login doesn't work."

*Fix — make the API same-origin.* `YarneFront/scripts/server.mjs` is already a
Node server in front of the SPA; add a reverse proxy so `/api/*` on the
storefront origin forwards to the API host. Then `resolveApiBase()` returns
`""` (same-origin) in production, the cookie becomes first-party
(`SameSite=Lax`, no `Partitioned`, no CHIPS dependency), and every
third-party-cookie problem disappears at once — in the PWA *and* in Safari
generally. This also removes the CORS preflight from every API call.
Non-trivial but the correct fix, and it makes a genuinely good thesis point:
*eliminating third-party-cookie dependence via same-origin proxying.*

*Cheaper fallback if the proxy proves troublesome:* keep cross-origin, but add
`Authorization: Bearer` as a secondary path with the access token in memory
(never `localStorage`) and the refresh token still cookie-based. More code and
weaker, so try the proxy first.

**Cause 2 — Google sign-in uses a popup that standalone PWAs cannot return
from.** `YarneFront/src/app/utils/googleSignIn.ts` uses
`oauth2.initTokenClient(...).requestAccessToken()`, which is the popup flow.
In an installed PWA (iOS especially) the popup opens in a detached browser
view with no opener relationship, so the `callback` never fires and sign-in
hangs silently.

*Fix:* detect standalone mode
(`window.matchMedia('(display-mode: standalone)').matches ||
navigator.standalone`) and switch to the **redirect** flow there
(`initCodeClient` with `ux_mode: 'redirect'`, or a plain OAuth redirect to the
authorize endpoint), handling the return on a `/auth/callback` route. Keep the
popup for regular browser tabs where it works fine. Backend needs a
matching `POST /api/auth/google/code` accepting an auth code instead of an
access token — `OAuthService.HandleGoogleAsync` keeps its existing validation,
gaining a code→token exchange step in front.

**Verify on real hardware, not just DevTools** — install the PWA on an actual
iPhone and an Android phone and log in via both password and Google.
Desktop "Add to Home Screen" does not reproduce iOS's cookie jar behaviour.

### Step 4 — Nova Poshta picker: online untouched, first-party offline body added (BUILT THEN REVERTED, 2026-08-30)

**Status: built, verified, then explicitly reverted by the owner the same day.**
Every file this step added is deleted; `NovaPoshtaPicker.tsx` and
`components/ui/command.tsx` are restored to their exact pre-session content
(diffed to confirm zero drift before restoring). Nothing about the online
Nova Poshta experience was ever left different from before this step started.
Kept below as a record of what was built and why it was undone — not a live
plan.

**Owner's reasoning for reverting:** wanted the online picker guaranteed
never at risk, and decided the offline picker wasn't worth carrying forward
independent of the broader offline-ordering feature it existed to serve —
see Step 5's revert note for the fuller context (both were reverted together).

**Shipped and verified** (before the revert) (via a temporary isolated test harness, removed after
use — the sandboxed dev environment has no live DB, so checkout couldn't be
reached normally): backend `ShippingController` +
`NovaPoshtaService.GetCitiesAsync`/`GetWarehousesAsync`
(`YarneAPIBack/Controllers/ShippingController.cs`); frontend split into
`NovaPoshtaPicker.tsx` (shell, unchanged output), `NovaPoshtaOnlineWidgetBody.tsx`
(extracted verbatim), `NovaPoshtaOfflineListBody.tsx` (new); `useOnlineStatus.ts`
hook (extracted from `AdminOperatingExpensesView`'s proven pattern);
`offline/shippingCache.ts` (IndexedDB: cities, per-city warehouses, last-used
branch); `offline/precacheShipping.ts` (low-priority background city fetch,
wired into `main.tsx`); `components/ui/command.tsx` restyled to brand.

Verified directly: online mode mounts the iframe with the exact `src`/`title`/
`allow` as before the split (proving the extraction is behaviourally
identical); offline mode's trigger icon and header icon swap live the instant
`navigator.onLine` flips; city search renders and filters; the no-cached-data
fallback shows `NocaPostOfflineIcon.png` + the right copy + back-navigation.
`onAnimationComplete` itself never fired in the sandboxed preview pane (a
compositor limitation of that tool, not the app — confirmed by forcing the
gate open and observing correct downstream behaviour), so real-device
confirmation of the entrance-animation timing is still worth doing once
deployed, though nothing about the split logic depends on that pane's quirk.

**The problem, as originally scoped:** delivery selection today is
`YarneFront/src/app/components/NovaPoshtaPicker.tsx`, which mounts a
**cross-origin iframe** (`https://widget.novapost.com/division/index.html`)
and receives the chosen branch over `postMessage`. A cross-origin iframe from
a third party **cannot be made to work offline** — a service worker cannot
cache a document on another origin (the response is opaque, and `sw.js`
explicitly bails on cross-origin at line 45).

**Decided: the online iframe experience is not replaced.** It stays exactly
as it is today, unchanged — the owner does not want to risk regressing a
working flow to solve an offline-only problem. Instead the component grows a
second, offline-only body that visually and behaviourally matches the same
shell, activated only when there's no connection.

**The shell/body split — this is the part that has to be done carefully:**

- `NovaPoshtaPicker.tsx` keeps its outer shell (overlay, sheet/dialog sizing,
  header, trigger button, animations, escape-key handling) **moved verbatim,
  not rewritten.** It gains exactly one job: decide which body to render.
- The existing iframe + geolocation + `postMessage` logic is extracted
  mechanically, copy-pasted not reimplemented, into `OnlineWidgetBody.tsx`.
  Extraction over rewrite specifically because a rewrite risks changing
  behaviour even with good intentions; a literal copy of working code cannot.
- A new `OfflineListBody.tsx` renders the offline flow (below).
- Both bodies end the same way — calling
  `onSelect({cityRef, cityName, warehouseRef, warehouseName})`, the exact
  shape the online path already produces — so `CheckoutPage.tsx` and anywhere
  else consuming this component needs **zero changes.**
- **Verification order matters**: extract the shell first, verify the online
  path is pixel- and behaviour-identical to before (screenshot diff + manual
  click-through) *before* writing one line of the offline body, so a
  regression can't get tangled up with new code and go unnoticed.

**Connectivity is tracked continuously, not checked once at click time.** A
one-time `navigator.onLine` read inside the click handler would mean the app
only "finds out" it's offline the moment someone taps the trigger — surprising
them after the fact rather than before. Instead: a small shared
`useOnlineStatus()` hook (`window.addEventListener('online'/'offline', …)`,
mirroring the identical pattern already proven in
`AdminOperatingExpensesView.tsx` — extracted into a hook now that it's needed
in two places, not duplicated) runs continuously at the top of the shell. Two
consequences:
- The **trigger button's icon swaps live** — `NovaPoshtaMark` when online,
  `/NocaPostOfflineIcon.png` (already committed, see below) when offline —
  the instant connectivity actually changes, before the sheet is ever opened.
  No surprise on tap; a glance at the page already tells you which mode it'll
  open in.
- When the sheet does open, the correct body renders immediately — the state
  was already known, nothing is "checked" in that moment.

**The offline body's data — and why it can't come from watching the online
widget.** The iframe is Nova Poshta's own UI on their domain; the app only
ever receives the *one final selection* a shopper made via `postMessage`,
never the list they browsed. So the offline list needs its own first-party
data source:

1. **Backend** — extend `INovaPoshtaService`/`NovaPoshtaService` with
   `GetCitiesAsync()` and `GetWarehousesAsync(cityRef)` calling Nova Poshta's
   `getCities` / `getWarehouses` methods (the service already speaks their API
   for waybills, tracking, and pricing — same client, same auth, two more
   methods). New `ShippingController`:
   `GET /api/shipping/cities`, `GET /api/shipping/warehouses?cityRef=…`, both
   `[AllowAnonymous]` (checkout is open to guests) and served with a long
   `Cache-Control`. Cached upstream in-process (`IMemoryCache`, ~24h) so Nova
   Poshta isn't hit per shopper. **This is a genuine prerequisite** — the
   offline body has nothing to display without it.
2. **Client-side cache** — `offline/shippingCache.ts`, IndexedDB, same
   `openDatabase()` pattern as `expenseQueue.ts`. Two stores: `cities`
   (populated once, in the background, via `requestIdleCallback` with a
   `setTimeout` fallback for Safari, shortly after app boot — low priority,
   never blocking first paint) and `warehouses` keyed by `cityRef` (populated
   lazily, the first time that city is actually fetched).
3. **Offline UI**: `components/ui/command.tsx` (the `cmdk`-based searchable
   list — already installed, already unused, same situation as the toast
   wrapper was) restyled to brand exactly like the toast fix, for city
   search → tap → branch list for that city.
4. **No-cached-data state — never a silent empty list.** If offline and this
   city was never visited before: an explicit message using
   `/NocaPostOfflineIcon.png` (not a generic icon), through real i18n keys,
   with a one-tap "use your last branch" button backed by a per-device
   IndexedDB record of the most recently selected branch — no login, no
   account, matching how every other piece of offline state in this app is
   scoped.

This step is independently defensible in the thesis: *adding a first-party,
cached, offline fallback beside an intentionally-preserved third-party
widget* — the size-versus-availability trade-off in point 2, and the
shell/body extraction discipline, are both real design discussions on their
own.

### Step 5 — Full-offline PWA incl. offline ordering (BUILT THEN REVERTED, 2026-08-30)

**Status: built, tested (idempotency test passing, 32/32), then explicitly
reverted by the owner the same day** — reverted together with Step 4, since
the order outbox's only real consumer was the offline checkout flow that
depended on Step 4's offline picker. `ClientOrderId` removed from `Order` via
a new forward migration (`RemoveClientOrderIdFromOrder`) rather than editing
the original `AddClientOrderIdToOrder`/`AddEurPricing` migration files —
both of those already existed in shared, pushed history by the time the
revert happened (see the note on committed state below), so the schema
change is undone honestly, not erased from the record. `outbox.ts` deleted
entirely rather than kept as shared infrastructure for a single remaining
consumer (`expenseQueue.ts`, restored to its original self-contained form) —
correct per this project's own YAGNI convention once its second consumer was
gone.

**Real complication worth recording:** by the time this revert happened, the
built code was no longer sitting as this session's uncommitted work — a
separate session/action had already committed it, bundled together with
unrelated real work (EUR pricing, a language-switcher fix, an OAuth
stuck-loading fix, wishlist removal), and pushed it to `origin/main`. The
revert was done as a new forward commit removing only the offline-picker and
order-queue files, verified file-by-file against that commit's diff to leave
the EUR/language-switcher/OAuth/wishlist changes completely untouched — never
rewriting the already-pushed commit.

**Kept from this step, deliberately, per explicit instruction:** the
pre-existing operating-expense offline queue (`expenseQueue.ts` /
`AdminOperatingExpensesView.tsx`) — untouched throughout, still works exactly
as it did before this session. Also kept: the Step 2.5 update-available
toast, which is unrelated to offline *data* features and was never in scope
for this revert.

**Original shipped scope, for the record:** `offline/outbox.ts` (generic, `expenseQueue.ts` now a thin
wrapper over it — verified via the pre-existing test suite still passing
unchanged); `offline/orderOutbox.ts`; `ClientOrderId` on `Order` (migration
`AddClientOrderIdToOrder`, filtered unique index) + `CreateOrderCore`'s dedup
check with a `DbUpdateException` fallback for the genuine race case; the
**idempotency test the plan called for** —
`OrdersControllerIdempotencyTests.cs`, `queue → sync → sync again → assert
exactly one order`, passing (32/32 total suite). Checkout: offline branch in
`placeOrder()`, persistent banner + toast using the agreed copy in both
languages, `watchOrderSync.ts` (global, fires on `online` regardless of which
page the shopper is on, plus once at boot for anything queued from a prior
session).

**Real finding, worth flagging clearly:** the plan's `sw.js` API-caching step
assumed same-origin. It isn't — `VITE_API_URL` points at a separate Railway
host (confirmed via `railway.env.example`), so **every `/api/*` request is
already cross-origin and skipped by `sw.js`'s origin check before the path
check ever runs.** The guard was still narrowed correctly (excludes only
`/api/orders`, not all of `/api/`), but it's inert until the same-origin
reverse-proxy work from Step 3's original diagnosis actually ships — which,
importantly, **never happened**; login started working again for the
unrelated stale-cache reason traced under Step 2.5, not because that proxy
was built. Practical effect right now: the offline order queue and the Nova
Poshta offline cache both work (they read/write IndexedDB directly, no
dependency on `sw.js` caching `/api/`), but the catalogue itself (product
listings) still won't render offline until that proxy lands. **If full
offline catalogue browsing matters for the thesis chapter, that proxy is the
remaining blocker — not scoped as its own step yet.**

**Also resolved as already-true, not built:** the plan's "price/stock
revalidation on sync" concern. Checked `OrdersController.CreateOrderCore` —
it already re-prices every item from current `Product`/`ProductColor` data
server-side unconditionally (`unitPrice = productColor?.Price ?? product.Price`),
ignoring whatever the client sent. A synced offline order automatically gets
current pricing through the exact same code path a normal order uses — no
new logic needed. Stock revalidation doesn't apply at all: this is a
made-to-order storefront with no finite stock tracking (confirmed via prior
git history — stock tracking was intentionally removed).

**Deferred, not built:** Background Sync API registration. Checked and
decided against it for now — it has no support in iOS Safari at all, which is
this project's primary PWA target, so the `online`-event fallback (already
fully built and working) is what actually matters here; Background Sync would
only add a Chrome/Android-specific enhancement on top. Revisit only if
Android-specific instant-sync-while-backgrounded becomes a real ask.

**Original scope note below, superseded by the above where they conflict.**

Depends on Step 4 only now — **Step 3 (login) is resolved**, so this covers
both guest and logged-in checkout with no remaining gap. Now that delivery
selection is first-party and cacheable, the offline order becomes possible.

- **`offline/outbox.ts`** — generalize `expenseQueue.ts`'s IndexedDB pattern
  into `createOutbox<T>(storeName)` returning `{queue, getQueued, remove,
  sync}`. `expenseQueue.ts` becomes a thin wrapper calling it — nearly a pure
  refactor, existing behavior unchanged.
- **`offline/orderOutbox.ts`** — second consumer of the same helper, holding
  queued orders (cart lines + recipient details + the Nova Poshta selection
  from Step 4). Works identically for guest and logged-in checkout — the
  order's own `GuestEmail`/`CustomerId` fields already distinguish the two,
  nothing new needed there.
- **`sw.js`** — stale-while-revalidate for `GET /api/products*`,
  `/api/collections*`, `/api/shipping/*`, and product images, so the catalogue
  and the branch picker render from cache when offline. Currently the fetch
  handler skips `/api/` entirely (line 46) — narrow that guard to mutating
  verbs and `/api/orders` only, instead of the whole `/api/` prefix.
- **Idempotency — the part that makes this thesis-grade rather than a
  tutorial.** Add `ClientOrderId` (`Guid`, unique index) to `Order`. The
  frontend generates it once when the order is *queued*, as a plain random
  `crypto.randomUUID()` — same call `expenseQueue.ts` already uses — before
  any network attempt, and reuses it across every retry and reconnect.
  **This ID has one job only: recognising a retried submission as the same
  attempt, not identifying who placed the order.** Guest vs. logged-in is
  already fully answered by the existing `GuestEmail`/`CustomerId` fields — a
  prefixed or structured ID (e.g. a "guest" range) would solve a
  problem that doesn't exist and miss the one that does. It also has to be
  something generated with zero network coordination, since it's created
  while offline — which a random UUID gives for free and a
  server-issued sequential ID cannot. `OrdersController.CreateOrder` treats a
  duplicate `ClientOrderId` as "return the existing order," never "create a
  second one." Write the test for this explicitly: queue → sync → sync again
  → assert exactly one order.
- **Checkout offline banner** — shown whenever `useOnlineStatus()` (Step 4)
  reports offline, through real i18n keys matching the app's existing
  `orderPlaced`/`Замовлення оформлено` tone (states acceptance as fact, not
  as a future promise):
  - EN: *"Order placed — you're offline, so it'll sync to us automatically
    the moment you're back online."*
  - UK: *"Замовлення оформлено — ви офлайн, тож воно автоматично
    синхронізується із системою, щойно з'явиться інтернет."*
- **Price and stock revalidation on sync.** An order queued offline may sync
  hours later against changed prices or sold-out stock. Decide and document
  the rule (recommended: accept the order, re-price server-side from current
  data, and flag it for the operator if the total moved) — an examiner will
  ask, and "we didn't think about it" is the bad answer. `OrderItem` already
  snapshots `ProductName`/`ProductCode`/`ListedPriceCents`, so the comparison
  data is there.
- **Background Sync API** where supported
  (`registration.sync.register('sync-outbox')`, `sync` event handler calling
  the outbox flush), falling back to the existing
  `window.addEventListener('online', …)` path on browsers without it (notably
  iOS Safari).
- ~~Update-available toast~~ — **shipped ahead of schedule, see above.**
- **Measurement** — Lighthouse PWA score before/after (Step 0 gives the
  "before"); a capability matrix (catalogue / branch picker / cart / checkout
  / expenses / admin — works offline yes/no, before vs. after); and the
  double-sync test as concrete proof on the duplicate-order question.

### Step 5.5 — Push notifications for synced offline orders

**Decided: build it.** Only meaningful for the installed PWA — iOS requires
the app added to the home screen for Web Push at all (shipped iOS 16.4), a
regular Safari tab can't request it, which is a nice consistency with
everything else scoped to standalone mode this session (the update toast, the
trigger icon).

- **VAPID keys** — a signing keypair the backend holds, generated once,
  stored as env vars alongside the app's other secrets
  (`Environment.GetEnvironmentVariable`, same convention as
  `ADMIN_BOOTSTRAP_TOKEN`/Nova Poshta credentials).
- **One deliberate new dependency: `WebPush`** (the standard small .NET
  library for this). Sending a real push means correctly implementing the Web
  Push encryption protocol (ECDH key agreement + AES-GCM payload encryption,
  RFC 8291) — genuine crypto, easy to get subtly wrong by hand, same reasoning
  as choosing `Otp.NET` over hand-rolled TOTP for the deferred 2FA item. Not
  reinvented.
- **New `PushSubscription` table** (`Endpoint`, `P256dh`, `Auth`, nullable
  `CustomerId` for guests, audit columns) + `POST /api/push/subscribe`.
- **Frontend** — permission requested contextually, at the moment an order is
  actually queued offline, never on page load or as a naggy prompt. On grant,
  `pushManager.subscribe(...)` and post the subscription to the backend.
- **`sw.js`** — `push` event handler (`self.registration.showNotification`)
  and a `notificationclick` handler that focuses or opens the app.
- **Sending the push** — triggered the moment a queued order successfully
  syncs (same place `OrdersController.CreateOrder` resolves the
  `ClientOrderId` dedup above).
- **The confirmation email needs no new code.** The synced order runs through
  the *exact same* order-creation path a normal online order already uses,
  which already sends the confirmation via the existing
  `OrderConfirmationEmailBuilder`/email service. Reusing that path — not
  building a parallel one — is what makes "usual workflow" actually true.

### Deferred — two-factor authentication

Considered and **deliberately deferred**. Analysis worth keeping for the
thesis's security section: Google/Apple sign-in already carries the identity
provider's own 2FA, so layering another prompt on those paths adds friction
without security. The genuine exposure is the *password* path
(`POST /api/auth/login`) on **Admin** accounts — which is how admins are
created (`AdminBootstrapController` takes email+password, no OAuth), and Admin
is the role holding the entire ERP. Regular customers do not warrant forced
2FA on a small storefront. If revisited: TOTP (RFC 6238) via `Otp.NET` — do
not hand-roll it — nullable `TwoFactorSecret`/`TwoFactorEnabledAt` on
`Customer`, `LoginAsync` returning a "2FA required" intermediate state, and a
second `/api/auth/login/verify-2fa` call issuing the real session.

### Tier 2, if time remains

`AdminMaterialForecastView` and the offline outbox both extend cleanly to
items #4 (recommender) and #5 (traceability view) without rework — the
recommender reads the same `OrderItem` history the forecast does, and the
traceability view is one read-only query over tables that already exist
(`ProductionMaterialConsumption` → `PurchaseOrderItem` → `Supplier`). Build
these only after Steps 0-3 land; they're additive, not blocking, and cutting
either one loses less than cutting anything above.
