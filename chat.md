# Yarne Admin Upload — Chat Summary & Change Log

**Branch:** `cursor/admin-contents-preview-a666`  
**Pull Request:** [#20 — Fix admin image uploads, storage, and deleted images on redeploy](https://github.com/MaxusFr0st/Yarne/pull/20)  
**Latest commit:** `10363812` — Fix Quick upload: use per-row label file inputs instead of broken ref.click()  
**Date:** July 12, 2026

---

## User problem (original → latest)

1. **Can't upload images** in admin — upload never starts or fails silently.
2. **Deleted images reappear** after redeploy.
3. **Railway deploy failures** after backend changes (Docker `VOLUME`, then C# build error).
4. **Product creation form** — clicking Quick / Add & crop on Constructor rows (e.g. Smoke · M) still doesn't upload; no loading state, photo never appears in the form.
5. User confirmed **all Railway variables are already set** and uploads **worked before** recent admin/crop changes.

---

## Timeline of investigation

### Initial hypothesis (partially wrong)
- Missing `VITE_API_URL` / CSP blocking API.
- **User pushed back:** variables are set; uploads worked before → treated as **code regression**, not config.

### Real regressions found

| # | Root cause | Symptom |
|---|------------|---------|
| 1 | **Mandatory crop** + crop dialog rendered **inside** product modal (`transform` + `overflow-hidden`) | File picked → crop opens **invisibly** → upload never starts |
| 2 | **Dual upload** (cropped + original in sequence) | Extra failure modes vs old single `POST` |
| 3 | **Shared hidden file input** + `ref.click()` + `uploadTargetVariantRef` | Quick button → file picker → **silent no-op** (ref lost before `onChange`) |
| 4 | **localStorage → server auto-push** on admin load when API slow after redeploy | Deleted home/carousel images **resurrected** from stale browser cache |
| 5 | **No physical file delete** on disk; DB refs only removed | Orphan `/uploads/...` files survive on Railway volume |
| 6 | **Docker `VOLUME` in Dockerfile** | Railway build error: *"docker VOLUME at Line 18 is not supported"* |
| 7 | **`OrderItem.ProductImageUrl`** referenced in `UploadFileStorageService` | API build failed — property doesn't exist on model |

### What did NOT change (storage model — same as before)

- Upload: `POST /api/images/upload` (Admin JWT required).
- API saves file under `wwwroot/uploads/`, returns `{ url: "/uploads/{guid}.webp" }`.
- DB stores **path only** (`/uploads/...`), not full URL.
- Frontend displays via `resolveMediaUrl()` → prepends API host at runtime.
- Products with colors: photos live in **`colorSizeVariants`** (Constructor), not top Images row.

---

## Commits on branch (newest first)

```
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

---

## Files changed (by area)

### Frontend — upload & admin UI

| File | Changes |
|------|---------|
| `YarneFront/src/app/components/admin/ImageCropDialog.tsx` | Portal crop dialog to `document.body` (`z-[200]`) |
| `YarneFront/src/app/pages/AdminPage.tsx` | Per-row label file inputs; Quick/Add & crop handlers; Constructor UX; normalize URLs on save |
| `YarneFront/src/app/utils/uploadCropPair.ts` | Single cropped upload; `uploadRawMediaFile()` (no crop); HEIC re-encode |
| `YarneFront/src/app/api/images.ts` | Dynamic `resolveApiBase()`; `deleteUploadedImage()`; better errors |
| `YarneFront/src/app/api/base.ts` | Runtime `config.js` support (`window.__YARNE_CONFIG__`) |
| `YarneFront/src/app/api/client.ts` | Dynamic API base per request |
| `YarneFront/src/app/utils/homePageMediaSelection.ts` | **Stop** pushing localStorage to API on admin load |
| `YarneFront/src/app/utils/carouselSelection.ts` | Same — server is source of truth |
| `YarneFront/src/app/utils/purgeUpload.ts` | Best-effort delete on explicit image remove |
| `YarneFront/src/app/utils/storefrontMedia.ts` | (unchanged logic) `/uploads/` path storage + resolve |
| `YarneFront/index.html` | Load `/config.js` before app |
| `YarneFront/public/config.js` | Runtime config stub |
| `YarneFront/scripts/docker-entrypoint.sh` | Write `config.js` + regenerate CSP when `VITE_API_URL` set at runtime |
| `YarneFront/Dockerfile` | Entrypoint script in runtime image |

### Backend — storage & delete

| File | Changes |
|------|---------|
| `YarneBack/.../Controllers/ImagesController.cs` | Relaxed MIME validation; `DELETE /api/images?path=` |
| `YarneBack/.../Services/UploadFileStorageService.cs` | Delete unreferenced files; reference checks across DB |
| `YarneBack/.../Services/Contracts/IUploadFileStorageService.cs` | New interface |
| `YarneBack/.../Services/ProductService.cs` | Delete orphan uploads on product update/delete |
| `YarneBack/.../Controllers/StorefrontSettingsController.cs` | Delete removed media paths on settings save |
| `YarneBack/.../Program.cs` | Register storage service; Kestrel body size |
| `YarneBack/.../Dockerfile` | `mkdir uploads`; **removed** `VOLUME` directive |
| `YarneBack/.../railway.toml` | Comment: mount volume in Railway UI |

### Docs

| File | Changes |
|------|---------|
| `RAILWAY_DEPLOY.md` | Runtime config, volume path, delete behavior |

---

## How product photo upload works now (intended)

1. Open **New/Edit Product** → select **colors** + **sizes** (required by validation).
2. Scroll to **Constructor (Color + Size + Photos + Stock)**.
3. On the row (e.g. **Smoke · M**):
   - **Quick** — pick file → `uploadRawMediaFile()` → `POST /api/images/upload` → append `/uploads/...` to `form.colorSizeVariants[key]`.
   - **Add & crop** — pick file → crop dialog (portaled) → upload cropped JPEG → same append.
4. Row shows **Uploading…** while in flight; errors appear in red above Constructor grid.
5. **Save product** — `handleSaveProduct` sends `colorSizeVariants` + derived `imageUrls` to API. **Upload alone does not persist to DB.**

### Top “Images” row when colors selected

- Read-only / derived. Use Constructor, not top **Add from device**.

---

## If upload still fails after PR #20 merge

Check in this order:

1. **Frontend actually redeployed** from `cursor/admin-contents-preview-a666` (commit `10363812`+), not old `main`.
2. **Logged in as Admin** — `uploadImage()` calls `assertTokenPresent()`; expired session throws before network.
3. **Browser devtools → Network** on Quick upload:
   - No request → UI bug or file picker cancelled.
   - `POST .../api/images/upload` → 401: re-login; 400: file type; 500: API/disk; CORS: `Cors__AllowedOrigins__0`.
4. **API redeployed** with latest backend (ImagesController MIME relax, no build errors).
5. **Volume** at `/app/wwwroot/uploads` on API service (optional for persistence, not for upload itself).

### Error text location in UI

- Constructor: red box above color/size grid (`uploadError` state).
- Top Images section: same state when no colors locked.

---

## Railway deploy checklist

| Service | Action |
|---------|--------|
| **API** | Merge PR → redeploy. No `VOLUME` in Dockerfile. Mount volume in UI: `/app/wwwroot/uploads`. |
| **Frontend** | Redeploy after merge. `VITE_API_URL` at build + runtime (entrypoint). |
| **CORS** | `Cors__AllowedOrigins__0` = exact frontend origin (scheme + host). |

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

## Chat message arc (condensed)

1. User: still can't upload; deleted images come back after redeploy → agent assumed env/CORS; implemented runtime config, file delete, dual-upload fixes.
2. User: variables already set; delete/add worked before → agent traced git history; found dual-upload + localStorage resurrection regressions.
3. User: Railway build failed (`VOLUME`) → removed `VOLUME` from Dockerfile.
4. User: Railway build failed (`OrderItem.ProductImageUrl`) → removed invalid reference check.
5. User: deployed but still can't add photo; doesn't even start → found invisible crop dialog inside modal; portaled to body.
6. User: changed storage/upload? → explained pipeline; added Quick upload; normalized `/uploads/` paths.
7. User: Quick does nothing on Smoke · M row → found shared hidden input + `ref.click()` silent failure; fixed with per-row `<label>` + file input.
8. User: create PR → [#20](https://github.com/MaxusFr0st/Yarne/pull/20) opened.
9. User: still fails on product form; use Sonnet to investigate → (parallel thread; fixes above on branch).
10. User: compose chat.md → this file.

---

## Outstanding / not proven fixed in production

- User reports upload **still failing** on product form after pushes — may indicate:
  - PR #20 **not merged/deployed** to production frontend yet.
  - **Auth/session** expiry blocking upload before network.
  - **API** not redeployed or still erroring on upload endpoint.
  - Environment-specific issue (needs Network tab error from user).

**Next debug step for user:** After deploying PR #20, click Quick on Constructor row, open DevTools → Network, and report status code + response body for `POST /api/images/upload`.

---

## Quick reference — key code paths

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

User clicks Save product
  → validateAndSubmit (≥3 photos per color-size-lace row)
  → handleSaveProduct → editProduct/addProduct API
```

---

*Generated from Cursor Cloud Agent session — branch `cursor/admin-contents-preview-a666`.*
