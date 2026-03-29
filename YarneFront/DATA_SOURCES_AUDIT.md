# Frontend Data Sources Audit — Colors & Images

## Theory: "Different data on first load, then correct seeded data after reload"

**Conclusion: THEORY PROVEN.**

---

## 1. Product List Data — `useProducts` (PRIMARY CULPRIT)

| Location | Source | When |
|----------|--------|------|
| `useProducts.ts` line 61 | `useState<Product[]>(PRODUCTS)` | **Initial state = mock PRODUCTS** |
| Same hook | `fetchProducts()` API | After ~100–500ms |
| Same hook | `setProducts(data.map(...))` | When API succeeds |
| Same hook | `setProducts(PRODUCTS)` | When API **fails** (catch) |

**Flow on hard reload:**
1. **Frame 1:** `products` = PRODUCTS (mock: Arles Cocoon, Mistral Turtleneck, etc., Unsplash URLs, color names like "Parchment", "Oxblood")
2. **Frame N (after fetch):** `products` = API data (seeded: YRN-001 Classic White Tee, etc., different colors/images)
3. UI re-renders → user sees the switch

**Vulnerability:** Initializing with `PRODUCTS` causes a flash of mock data before API responds.

---

## 2. Single Product Data — `useProduct`

| Location | Source | When |
|----------|--------|------|
| `useProduct` line 89 | `useState<Product \| null>(null)` | Initial state = null |
| Same hook | `fetchProduct(id)` | On mount |
| Same hook | `setProduct(mapDetailToFrontend(data))` | API success |
| Same hook | `PRODUCTS.find(p => p.id === id)` | API **fails** (catch) |

**No initial mock flash** — starts null, shows loading until API responds. Fallback to PRODUCTS only on error.

---

## 3. Admin Data — `useAdminData`

| Location | Source | When |
|----------|--------|------|
| `useAdminData.ts` line 86 | `useState([])` | Initial state = empty |
| Same hook | `fetchProducts({ includeInactive: true })` | On mount |
| Same hook | `setProducts(prods.map(...))` | API success |
| Same hook | `setProducts([])` | API **fails** (catch) |

**No mock flash** — starts empty, uses API only. Admin is separate from customer-facing `useProducts`.

---

## 4. Search Overlay — `SearchOverlay.tsx`

| Location | Source |
|----------|--------|
| Line 6 | `import { products } from "../data/products"` |

Uses `products` directly from data file. The data module exports `PRODUCTS`, so this may be `PRODUCTS as products` or a different export — either way, search uses **static mock data only**, not API. (Separate from the reload issue.)

---

## 5. API Layer — No Caching

| File | Behavior |
|------|----------|
| `api/client.ts` | Plain `fetch()`, no cache, no retry |
| `api/products.ts` | `apiRequest()` → fetch → JSON |

No service worker, no React Query/SWR, no localStorage product cache. Data comes from useState + fetch only.

---

## Summary

| Component | Initial Render | After API (success) | After API (fail) |
|-----------|----------------|---------------------|------------------|
| **useProducts** (Home, Collection, ProductDetail related, BestSellers) | **PRODUCTS (mock)** | API data | PRODUCTS (mock) |
| useProduct (single) | null (loading) | API data | PRODUCTS fallback |
| useAdminData | [] (loading) | API data | [] |
| SearchOverlay | N/A (static) | N/A | N/A |

**Root cause:** `useProducts` initializes `useState` with `PRODUCTS`, so the first paint shows mock data. When the API returns, state updates and the UI switches to seeded data — producing the observed "wrong data, then correct data" behavior.
