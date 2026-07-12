# Yarne Admin — Chat Summary & Change Log

**Branch:** `cursor/admin-contents-preview-a666`  
**Pull Request:** [#20 — Fix admin image uploads, storage, and deleted images on redeploy](https://github.com/MaxusFr0st/Yarne/pull/20)  
**Latest commit:** `3169baa2` — Add chat.md summarizing upload investigation and all branch changes  
**Base branch:** `main`  
**Date:** July 12, 2026

---

## Executive summary

This session started with **admin image uploads broken** on the Yarne storefront admin, especially in the **product creation/edit form**. The user also reported **deleted images reappearing after redeploy** and **Railway build failures** after backend changes.

Investigation traced the problems to **code regressions** introduced during recent admin/crop/preview work — not missing Railway environment variables (user confirmed all vars were already set and uploads worked before).

Fixes on branch `cursor/admin-contents-preview-a666` address:

1. Invisible crop dialog trapping uploads inside the product modal
2. Silent Quick-upload no-op from shared hidden file input + `ref.click()`
3. Dual-upload regression (cropped + original) vs the old single `POST` flow
4. localStorage resurrecting deleted home/carousel images when API was slow after redeploy
5. Orphan files on disk with no physical delete when images removed from DB
6. Railway Docker `VOLUME` directive and invalid `OrderItem.ProductImageUrl` reference breaking API builds

**Current PR to merge:** [#20](https://github.com/MaxusFr0st/Yarne/pull/20). Earlier PRs #16–#19 are superseded.

**Outstanding:** User reported upload may still fail on the product form in production — likely needs PR merge + redeploy of **both** API and frontend, then Network-tab debugging if it persists.

---

## User problem (original → latest)

| # | Report |
|---|--------|
| 1 | Can't upload images in admin — upload never starts or fails silently |
| 2 | Deleted images reappear after redeploy |
| 3 | Railway deploy failures after backend changes |
| 4 | Product form: Quick / Add & crop on Constructor rows (e.g. Smoke · M) does nothing — no loading state, photo never appears |
| 5 | All Railway variables already set; uploads worked before recent changes |

---

## Chat message arc (full)

1. **User:** Still can't upload; deleted images come back after redeploy.
   - **Agent:** Investigated env/CORS hypothesis; implemented runtime `config.js`, dynamic API base, file delete endpoints, upload pipeline fixes.

2. **User:** Variables are already set; delete/add worked before — not a config issue.
   - **Agent:** Traced git history; found dual-upload regression and localStorage → API auto-push resurrecting deleted images.

3. **User:** Railway build failed — `VOLUME` not supported.
   - **Agent:** Removed `VOLUME` from API Dockerfile; documented mounting volume in Railway UI instead.

4. **User:** Railway build failed again — `OrderItem.ProductImageUrl` doesn't exist.
   - **Agent:** Removed invalid reference from `UploadFileStorageService`.

5. **User:** Deployed but still can't add photo; upload doesn't even start.
   - **Agent:** Found `ImageCropDialog` rendered inside product modal's `motion.div` with `transform` + `overflow-hidden` — `position: fixed` crop dialog was invisible/clipped. Fixed by portaling dialog to `document.body`.

6. **User:** Did you change storage/upload? It worked before.
   - **Agent:** Explained pipeline unchanged (`POST /api/images/upload` → `/uploads/...` path in DB); added Quick upload (no crop); normalized stored URLs.

7. **User:** Quick does nothing on Smoke · M Constructor row.
   - **Agent:** Found shared hidden `<input>` + `uploadTargetVariantRef` + programmatic `ref.click()` — variant target lost before `onChange`. Fixed with per-row `<label>` + file input.

8. **User:** Create PR.
   - **Agent:** Opened [#20](https://github.com/MaxusFr0st/Yarne/pull/20).

9. **User:** Upload still fails on product form; investigate with Sonnet-level thoroughness.
   - **Agent:** Continued investigation on branch; fixes through `10363812`; production failure may need deploy + runtime Network evidence.

10. **User:** Compose changes and this chat into `chat.md`.
    - **Agent:** This file (`3169baa2`).

---

## Root causes identified

| # | Root cause | Symptom |
|---|------------|---------|
| 1 | **Mandatory crop** + crop dialog inside product modal (`transform` + `overflow-hidden`) | File picked → crop opens **invisibly** → upload never starts |
| 2 | **Dual upload** (`uploadCroppedWithOriginal` — cropped + original sequentially) | Extra failure modes vs old single `POST` |
| 3 | **Shared hidden file input** + `ref.click()` + `uploadTargetVariantRef` | Quick → file picker → **silent no-op** |
| 4 | **localStorage → server auto-push** on admin load when API slow/unavailable | Deleted home/carousel images **resurrected** |
| 5 | **No physical file delete** on disk | Orphan `/uploads/...` files survive on Railway volume |
| 6 | **`VOLUME` in Dockerfile** | Railway: *"docker VOLUME at Line 18 is not supported"* |
| 7 | **`OrderItem.ProductImageUrl`** in `UploadFileStorageService` | API build failed — property doesn't exist |

### What did NOT change (storage model — same as before)

- Upload: `POST /api/images/upload` (Admin JWT required)
- API saves under `wwwroot/uploads/`, returns `{ url: "/uploads/{guid}.webp" }`
- DB stores **path only** (`/uploads/...`), not full URL
- Frontend displays via `resolveMediaUrl()` → prepends API host at runtime
- Products with colors: photos live in **`colorSizeVariants`** (Constructor), not top Images row

---

## Commits on branch (newest first)

```
3169baa2 Add chat.md summarizing upload investigation and all branch changes
10363812 Fix Quick upload: use per-row label file inputs instead of broken ref.click()
51cf8dc4 Align photo upload/storage with pre-crop flow and add quick upload
f0a23e65 Fix invisible crop dialog blocking all product image uploads
e23ccd90 Fix API build: OrderItem has no ProductImageUrl column
a21c3964 Remove Docker VOLUME directive — Railway requires UI volumes instead
afaa4814 Fix real upload regression and stop localStorage resurrecting deleted images
2560e7cd Fix image uploads and delete orphaned files on redeploy
b20c162f Fix image upload: relax validation, timeout original, better errors
a434c4dc Make product preview interactive with full variant photo browser
d089ccd0 Fix image upload failures after crop
8820cab6 Admin contents: no default text persistence, section crop, all-color preview
```

**Diff vs `main`:** 33 files, +2028 / −408 lines

---

## Files changed (by area)

### Frontend — upload & admin UI

| File | Changes |
|------|---------|
| `YarneFront/src/app/components/admin/ImageCropDialog.tsx` | Portal crop dialog to `document.body` at `z-[200]` |
| `YarneFront/src/app/pages/AdminPage.tsx` | Per-row label file inputs; `handleVariantQuickUpload` / `handleVariantCropUpload`; Constructor UX; URL normalization on save |
| `YarneFront/src/app/utils/uploadCropPair.ts` | **New** — single cropped upload; `uploadRawMediaFile()` (no crop); HEIC re-encode |
| `YarneFront/src/app/api/images.ts` | Dynamic `resolveApiBase()`; `deleteUploadedImage()`; `assertTokenPresent()`; better errors |
| `YarneFront/src/app/api/base.ts` | Runtime `config.js` support (`window.__YARNE_CONFIG__`) |
| `YarneFront/src/app/api/client.ts` | Dynamic API base per request |
| `YarneFront/src/app/config/runtime.ts` | **New** — runtime config reader |
| `YarneFront/src/app/hooks/useCropDialog.tsx` | **New** — crop dialog hook |
| `YarneFront/src/app/utils/homePageMediaSelection.ts` | **Stop** pushing localStorage to API on admin load |
| `YarneFront/src/app/utils/carouselSelection.ts` | Server is source of truth; localStorage read-only fallback |
| `YarneFront/src/app/utils/featuredShowcaseSelection.ts` | Selection persistence adjustments |
| `YarneFront/src/app/utils/homeSectionsSelection.ts` | Section selection adjustments |
| `YarneFront/src/app/utils/purgeUpload.ts` | **New** — best-effort delete on explicit image remove |
| `YarneFront/src/app/utils/imageCropMeta.ts` | Crop metadata helpers |
| `YarneFront/index.html` | Load `/config.js` before app |
| `YarneFront/public/config.js` | Runtime config stub |
| `YarneFront/scripts/docker-entrypoint.sh` | Write `config.js` + regenerate CSP when `VITE_API_URL` set at runtime |
| `YarneFront/Dockerfile` | Entrypoint script in runtime image |

### Frontend — preview & storefront

| File | Changes |
|------|---------|
| `YarneFront/src/app/components/admin/ProductCardPreviewPanel.tsx` | Interactive preview with full variant photo browser |
| `YarneFront/src/app/components/ProductCard.tsx` | Variant photo display improvements |
| `YarneFront/src/app/pages/ProductDetail.tsx` | Minor variant photo handling |
| `YarneFront/src/app/utils/buildVariantPhotoGroups.ts` | **New** — group variant photos for preview |
| `YarneFront/src/app/utils/productGuaranteeContent.ts` | Admin contents: no default text persistence |

### Backend — storage & delete

| File | Changes |
|------|---------|
| `YarneBack/.../Controllers/ImagesController.cs` | Relaxed MIME validation; `DELETE /api/images?path=` |
| `YarneBack/.../Services/UploadFileStorageService.cs` | **New** — delete unreferenced files; reference checks across DB |
| `YarneBack/.../Services/Contracts/IUploadFileStorageService.cs` | **New** interface |
| `YarneBack/.../Services/ProductService.cs` | Delete orphan uploads on product update/delete |
| `YarneBack/.../Controllers/StorefrontSettingsController.cs` | Delete removed media paths on settings save |
| `YarneBack/.../Program.cs` | Register storage service; Kestrel body size |
| `YarneBack/.../Dockerfile` | `mkdir uploads`; **removed** `VOLUME` directive |
| `YarneBack/.../railway.toml` | Comment: mount volume in Railway UI |

### Docs

| File | Changes |
|------|---------|
| `RAILWAY_DEPLOY.md` | Runtime config, volume path, delete behavior |
| `chat.md` | This file |

---

## How product photo upload works (intended flow)

1. Open **New/Edit Product** → select **colors** + **sizes** (validation requires colors).
2. Scroll to **Constructor (Color + Size + Photos + Stock)**.
3. On the row (e.g. **Smoke · M**):
   - **Quick** — pick file → `uploadRawMediaFile()` → `POST /api/images/upload` → append `/uploads/...` to `form.colorSizeVariants[key]`.
   - **Add & crop** — pick file → portaled crop dialog → upload cropped JPEG → same append.
4. Row shows **Uploading…** while in flight; errors appear in red above Constructor grid.
5. **Save product** — `handleSaveProduct` sends `colorSizeVariants` + derived `imageUrls` to API. **Upload alone does not persist to DB.**

### Top “Images” row when colors are selected

Read-only / derived. Use **Constructor**, not top **Add from device**.

---

## Key code paths

```
User clicks Quick (Constructor row)
  → handleVariantQuickUpload(colorId, sizeId, lace, event)
  → uploadRawMediaFile(file)
  → prepareUploadableFile (HEIC → JPEG if needed)
  → uploadImage(file)
  → assertTokenPresent()
  → fetch(POST /api/images/upload, FormData, Bearer token)
  → normalizeStoredMediaUrl(response.url)
  → appendVariantPhoto → form.colorSizeVariants[key]

User clicks Add & crop
  → handleVariantCropUpload(...)
  → ImageCropDialog (portaled to document.body)
  → uploadCroppedWithOriginal (single cropped POST)
  → appendVariantPhoto

User clicks Save product
  → validateAndSubmit (≥3 photos per color-size-lace row)
  → handleSaveProduct → editProduct / addProduct API
```

---

## Railway deploy checklist

| Service | Action |
|---------|--------|
| **API** | Merge PR #20 → redeploy. No `VOLUME` in Dockerfile. Mount volume in Railway UI: `/app/wwwroot/uploads`. |
| **Frontend** | Redeploy after merge. `VITE_API_URL` at build + runtime (entrypoint writes `config.js`). |
| **CORS** | `Cors__AllowedOrigins__0` = exact frontend origin (scheme + host). |
| **Auth** | Admin JWT in `sessionStorage` (`auth_token` / `auth_user`) required for upload. |

---

## If upload still fails after PR #20 merge

Check in this order:

1. **Frontend redeployed** from `cursor/admin-contents-preview-a666` (commit `10363812`+), not old `main`.
2. **Logged in as Admin** — `uploadImage()` calls `assertTokenPresent()`; expired session throws before network.
3. **Browser DevTools → Network** on Quick upload:
   - No request → UI bug or file picker cancelled.
   - `POST .../api/images/upload` → **401:** re-login; **400:** file type; **500:** API/disk; **CORS:** check `Cors__AllowedOrigins__0`.
4. **API redeployed** with latest backend (ImagesController MIME relax, no build errors).
5. **Volume** at `/app/wwwroot/uploads` on API service (optional for persistence across redeploys, not required for upload itself).

### Error text location in UI

- Constructor: red box above color/size grid (`uploadError` state).
- Top Images section: same state when no colors locked.

### Recommended next debug step

After deploying PR #20, click **Quick** on a Constructor row, open DevTools → Network, and report **status code + response body** for `POST /api/images/upload`.

---

## Pull requests created during chat

| PR | Title | Notes |
|----|-------|-------|
| [#16](https://github.com/MaxusFr0st/Yarne/pull/16) | Fix image upload after crop + interactive product preview | Superseded |
| [#17](https://github.com/MaxusFr0st/Yarne/pull/17) | Fix image uploads + delete orphaned files | Superseded |
| [#18](https://github.com/MaxusFr0st/Yarne/pull/18) | Upload regression + localStorage fix | Superseded |
| [#19](https://github.com/MaxusFr0st/Yarne/pull/19) | Photo upload/storage pipeline + quick upload | Superseded |
| **[#20](https://github.com/MaxusFr0st/Yarne/pull/20)** | **Fix admin image uploads, storage, and deleted images on redeploy** | **Current — merge this** |

---

## Outstanding / not proven fixed in production

User reports upload **still failing** on product form after pushes. Possible causes:

| Cause | Notes |
|-------|-------|
| PR #20 not merged/deployed | Production may still run pre-fix code on `main` |
| Auth/session expired | `assertTokenPresent()` blocks before network |
| API upload endpoint failing | Needs Network tab: 401/400/500/CORS |
| Frontend/API version mismatch | Backend MIME fixes require API redeploy |

**Possible follow-up improvement:** Add visible error toast when `handleVariantQuickUpload` catches failure (errors may be scrolled out of view above Constructor grid).

---

## Agent session notes

- Investigation treated as **code regression**, not env misconfiguration, per user feedback.
- Storage model intentionally preserved: `/uploads/` paths in DB, full URLs resolved at display time.
- Branch also includes earlier **admin contents/preview** work (`8820cab6`, `a434c4dc`) bundled into PR #20.
- All identified build blockers (`VOLUME`, `ProductImageUrl`) fixed on branch.

---

*Generated from Cursor Cloud Agent session — branch `cursor/admin-contents-preview-a666`.*
