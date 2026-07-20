import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { fetchProducts, fetchProduct, type ProductDto, type ProductDetailDto, type ColorVariantDto, type SuggestedProductDto, type ProductImageDto } from "../api/products";
import type { Product, ProductImage, ColorVariant } from "../types/product";
import { normalizeLaceVariants } from "../utils/variantStock";
import {
  loadProductDetail,
  loadProductsList,
  productsQueryKey,
  readProductDetailCache,
  readProductsListCache,
  subscribeProductsCache,
  getProductsCacheGeneration,
} from "../utils/productsCache";

const PLACEHOLDER_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3Cpath fill='%232D241E' fill-opacity='0.3' d='M80 200h240M200 80v240' stroke='%232D241E' stroke-opacity='0.2'/%3E%3C/svg%3E";
const PLACEHOLDER: ProductImage = { src: PLACEHOLDER_SRC, focalX: 0.5, focalY: 0.35 };

const FALLBACK_SIZES = [
  { name: "XS" },
  { name: "S" },
  { name: "M" },
  { name: "L" },
  { name: "XL" },
];

function mapSizes(sizes?: { name: string; nameUk?: string | null }[] | null) {
  if (!sizes?.length) return FALLBACK_SIZES;
  return sizes.map((s) => ({ name: s.name, nameUk: s.nameUk ?? null }));
}

function toProductImage(dto: ProductImageDto | null | undefined): ProductImage {
  if (!dto?.src?.trim()) return PLACEHOLDER;
  return { src: dto.src, focalX: dto.focalX ?? 0.5, focalY: dto.focalY ?? 0.35 };
}

function toProductImages(dtos: ProductImageDto[] | null | undefined): ProductImage[] {
  if (!dtos?.length) return [];
  const seen = new Set<string>();
  const result: ProductImage[] = [];
  for (const dto of dtos) {
    const src = dto.src?.trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    result.push({ src, focalX: dto.focalX ?? 0.5, focalY: dto.focalY ?? 0.35 });
  }
  return result;
}

function toColorVariant(c: ColorVariantDto): ColorVariant {
  const imgs = toProductImages(c.images);
  const primary = toProductImage(c.image);
  if (imgs.length === 0) imgs.push(primary);

  const sizeImages: Record<string, ProductImage[]> = {};
  if (c.sizeImages) {
    for (const [size, dtos] of Object.entries(c.sizeImages)) {
      const mapped = toProductImages(dtos);
      if (mapped.length) sizeImages[size] = mapped;
    }
  }

  return {
    colorId: c.colorId ?? undefined,
    name: c.name,
    nameUk: c.nameUk ?? null,
    hex: c.hex,
    image: imgs[0] ?? primary,
    images: imgs,
    sizeImages: Object.keys(sizeImages).length ? sizeImages : undefined,
    sizeStocks: c.sizeStocks ?? {},
    laceVariants: normalizeLaceVariants(c.laceVariants),
  };
}

function mapToFrontendProduct(d: ProductDto): Product {
  const colors: ColorVariant[] = d.colors && d.colors.length > 0
    ? d.colors.map(toColorVariant)
    : d.images && d.images.length > 0
    ? d.images.map((img, i) => {
        const pi = toProductImage(img);
        return { name: `Variant ${i + 1}`, hex: "#2D241E", image: pi, images: [pi] };
      })
    : d.primaryImage
    ? [{ name: "Default", hex: "#2D241E", image: toProductImage(d.primaryImage), images: [toProductImage(d.primaryImage)] }]
    : [{ name: "Default", hex: "#2D241E", image: PLACEHOLDER, images: [PLACEHOLDER] }];

  return {
    id: d.productCode,
    name: d.name,
    subtitle: d.material ?? d.producerName ?? "",
    price: Number(d.price),
    stock: d.quantityInStock,
    category: d.categoryName,
    isNew: d.isNew ?? false,
    isBestseller: d.isBestseller ?? false,
    createdAt: d.createdAt,
    lace: d.lace ?? false,
    sizes: mapSizes(d.sizes),
    defaultSize: d.defaultSize ?? undefined,
    defaultColor: d.defaultColor ?? undefined,
    defaultFurnitureColor: d.defaultFurnitureColor ?? undefined,
    description: d.description ?? "",
    details: [],
    colors,
    furnitureColors: (d.furnitureColors ?? []).map((fc) => ({
      name: fc.name,
      nameUk: fc.nameUk ?? null,
      hex: fc.hex,
    })),
  };
}

function mapSuggestedToProduct(s: SuggestedProductDto): Product {
  const image = s.primaryImage ? toProductImage(s.primaryImage) : PLACEHOLDER;
  return {
    id: s.productCode,
    name: s.name,
    subtitle: s.categoryName,
    price: Number(s.price),
    category: s.categoryName,
    isNew: s.isNew,
    isBestseller: s.isBestseller,
    sizes: FALLBACK_SIZES,
    description: "",
    details: [],
    // Suggestion cards don't carry the full color list — just the related product's own
    // default color, if it has one, so the card shows a real swatch/name instead of a
    // placeholder ("Default" used to leak into the UI as literal customer-facing text).
    colors: [{
      name: s.defaultColorName ?? "",
      nameUk: s.defaultColorNameUk ?? null,
      hex: s.defaultColorHex ?? "#2D241E",
      image,
      images: [image],
    }],
  };
}

function mapDetailToFrontend(d: ProductDetailDto): Product {
  const colors: ColorVariant[] = d.colors.map(toColorVariant);
  if (colors.length === 0 && d.primaryImage) {
    const pi = toProductImage(d.primaryImage);
    colors.push({ name: "Default", hex: "#2D241E", image: pi, images: [pi] });
  }

  return {
    id: d.productCode,
    name: d.name,
    subtitle: d.subtitle ?? d.material ?? "",
    price: Number(d.price),
    stock: d.quantityInStock,
    category: d.categoryName,
    isNew: d.isNew,
    isBestseller: d.isBestseller,
    lace: d.lace ?? false,
    sizes: mapSizes(d.sizes),
    defaultSize: d.defaultSize ?? undefined,
    defaultColor: d.defaultColor ?? undefined,
    defaultFurnitureColor: d.defaultFurnitureColor ?? undefined,
    description: d.description ?? "",
    details: d.details,
    colors,
    furnitureColors: (d.furnitureColors ?? []).map((fc) => ({
      name: fc.name,
      nameUk: fc.nameUk ?? null,
      hex: fc.hex,
    })),
    suggestedProductCodes: d.suggestedProductCodes ?? [],
    suggestedProducts: (d.suggestedProducts ?? []).map(mapSuggestedToProduct),
    hasConfiguredSuggestions: d.hasConfiguredSuggestions ?? false,
    producerName: d.producerName ?? undefined,
    laceSurcharge: d.laceSurcharge ?? 0,
    laceColorOptions: (d.laceColorOptions ?? []).map((o) => ({
      colorId: o.colorId,
      colorName: o.colorName,
      colorNameUk: o.colorNameUk ?? null,
      colorHex: o.colorHex,
      surcharge: Number(o.surcharge),
    })),
  };
}

export function useProducts(
  params?: { category?: string; isNew?: boolean; collectionId?: number; includeInactive?: boolean }
) {
  const cacheKey = productsQueryKey(params);
  const cacheGeneration = useSyncExternalStore(
    subscribeProductsCache,
    getProductsCacheGeneration,
    () => 0,
  );
  const entry = useSyncExternalStore(
    subscribeProductsCache,
    () => readProductsListCache(cacheKey),
    () => null,
  );
  const [pending, setPending] = useState(() => !entry?.fetchedAt);

  const refetch = useCallback(() => {
    setPending(true);
    void loadProductsList(cacheKey, () => fetchProducts(params), { force: true }).finally(() => {
      setPending(false);
    });
  }, [cacheKey, params?.category, params?.isNew, params?.collectionId, params?.includeInactive, cacheGeneration]);

  useEffect(() => {
    let cancelled = false;
    const current = readProductsListCache(cacheKey);
    setPending(!current?.fetchedAt);

    void loadProductsList(cacheKey, () => fetchProducts(params)).finally(() => {
      if (!cancelled) setPending(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, params?.category, params?.isNew, params?.collectionId, params?.includeInactive, cacheGeneration]);

  return {
    products: (entry?.data ?? []).map(mapToFrontendProduct),
    loading: pending && !entry?.fetchedAt,
    error: entry?.error ?? null,
    fromApi: Boolean(entry?.fetchedAt && !entry.error),
    refetch,
  };
}

export function useProduct(id: string | undefined) {
  const entry = useSyncExternalStore(
    subscribeProductsCache,
    () => (id ? readProductDetailCache(id) : null),
    () => null,
  );
  const [pending, setPending] = useState(() => Boolean(id) && !entry?.data);

  const load = useCallback((force = false) => {
    if (!id) {
      setPending(false);
      return;
    }
    if (!force && readProductDetailCache(id)?.data) {
      setPending(false);
      return;
    }
    setPending(true);
    void loadProductDetail(id, () => fetchProduct(id), { force }).finally(() => {
      setPending(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) {
      setPending(false);
      return;
    }
    load(false);
  }, [id, load]);

  return {
    product: entry?.data ? mapDetailToFrontend(entry.data) : null,
    loading: pending && !entry?.data,
    error: entry?.error ?? null,
    refetch: () => load(true),
  };
}
