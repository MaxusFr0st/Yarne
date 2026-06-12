# Lace Feature Implementation Context

## Goal
Add `lace` bool support across products so customers can toggle lace on/off on the product detail page, seeing different photos and stock per color + size + lace combination. Admin must configure lace variants when creating/editing products.

## Architecture

### Product-level flag
- `Product.Lace` (bool) — whether this product supports lace variants (customer sees lace toggle when true)

### Variant tables (extend existing color+size model)
- `ProductColorSizeImage` — add `Lace` bool column (default false)
- `ProductVariantStock` — add `Lace` bool column; update composite PK from `(ProductId, ColorId, SizeId)` to `(ProductId, ColorId, SizeId, Lace)`

### API DTO changes

**ProductDto / ProductDetailDto:**
```csharp
public bool Lace { get; set; }  // product supports lace option
```

**ColorVariantDto** — add lace-scoped nested maps:
```csharp
// Key = size name (e.g. "M")
public Dictionary<string, LaceSizeVariantDto> LaceVariants { get; set; } = new();

public class LaceSizeVariantDto {
    public List<string> WithLaceImages { get; set; } = new();
    public List<string> WithoutLaceImages { get; set; } = new();
    public int WithLaceStock { get; set; }
    public int WithoutLaceStock { get; set; }
}
```
Keep existing `SizeImages` / `SizeStocks` populated with **without-lace** (Lace=false) data for backward compatibility.

**CreateProductRequest inputs:**
```csharp
public bool Lace { get; set; }
// ColorSizeVariantInput + VariantStockInput: add `public bool Lace { get; set; }`
```

### Backend mapping (ProductService.MapToProductDto)
Group `ProductColorSizeImage` and `ProductVariantStock` by size name, then split by `Lace` bool into `LaceSizeVariantDto`.

### Admin form key pattern
Extend variant key from `"colorId:sizeId"` to `"colorId:sizeId:lace"` where lace is `"true"` or `"false"`.

When `Product.Lace` is false, admin UI shows only lace=false variants (current behavior).
When `Product.Lace` is true, admin shows TWO blocks per color+size: "Without lace" and "With lace" — each with photos (min 3) and stock.

### Customer product detail (ProductDetail.tsx + MobileProductDetailView.tsx)
- Add `activeLace` state (bool, default false)
- Show lace toggle only when `product.lace === true`
- Image selection priority:
  1. `selectedColor.laceVariants[activeSize][activeLace ? 'withLace' : 'withoutLace']` images
  2. Fallback: existing `sizeImages[activeSize]` chain
- Stock: read from `laceVariants[activeSize]` withLace/withoutLace stock based on toggle
- Pass `activeLace` to addToCart (may need cart type extension)

### Frontend types (types/product.ts)
```typescript
export interface LaceSizeVariant {
  withLaceImages: string[];
  withoutLaceImages: string[];
  withLaceStock: number;
  withoutLaceStock: number;
}
export interface ColorVariant {
  // existing fields...
  laceVariants?: Record<string, LaceSizeVariant>; // key = size name
}
export interface Product {
  lace?: boolean;
}
```

### Files to modify

**Backend:**
- `Models/Product.cs` — add `Lace`
- `Models/ProductColorSizeImage.cs` — add `Lace`
- `Models/ProductVariantStock.cs` — add `Lace`, update PK
- `Data/YarneDbContext.cs` — configure new columns/PK
- New EF migration
- `DTOs/Product/ProductDto.cs`, `ProductDetailDto.cs`, `CreateProductRequest.cs`, `UpdateProductRequest.cs`, `ColorVariantDto.cs`
- `Services/ProductService.cs` — create/update/map logic
- `Data/YarneCatalogSeed.cs` — if seeding variants

**Frontend:**
- `api/products.ts` — DTOs + request types
- `hooks/useProducts.ts` — mapping
- `hooks/useAdminData.ts` — admin product mapping
- `pages/AdminPage.tsx` — lace toggle on product, dual variant blocks
- `pages/ProductDetail.tsx` — lace toggle, image/stock selection
- `components/MobileProductDetailView.tsx` — lace toggle UI
- `i18n/locales/en.ts`, `uk.ts` — lace labels

## Stock bug (Task 4 — do AFTER lace photos)
Root causes:
1. Admin edit form initializes `variantStocks: {}` — never loads from API `sizeStocks`
2. `handleSaveProduct` prefers `data.stock` (general) over variant sum when stock field is filled
3. `ProductService.ComputeTotalStock` returns `explicitStock` when > 0, ignoring variants
4. `CreateProductAsync` uses `request.QuantityInStock > 0` before variant sum

Fix:
- Always persist variant stocks; compute `QuantityInStock` as sum of all variant stocks (ignore manual general stock when variants exist)
- Load variantStocks from `c.sizeStocks` / `c.laceVariants` when editing
- Frontend: use variant-specific stock keyed by color+size+lace; never fall back to general when variant data exists

## Design notes (Yarne brand)
- Palette: `#F5F2ED` bg, `#2D241E` text, `#4A0E0E` accent
- Fonts: Cormorant Garamond (display), DM Sans (UI)
- Lace toggle: subtle pill switch, label "With lace" / "Without lace"
- Do not use emoji icons — use Lucide
