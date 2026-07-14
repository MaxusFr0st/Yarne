import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { fetchProducts, fetchProduct, type ProductDto, type ProductDetailDto, type ColorVariantDto, type SuggestedProductDto } from "../api/products";
import type { Product, ColorVariant } from "../types/product";
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

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3Cpath fill='%232D241E' fill-opacity='0.3' d='M80 200h240M200 80v240' stroke='%232D241E' stroke-opacity='0.2'/%3E%3C/svg%3E";

function toColorVariant(c: ColorVariantDto): ColorVariant {
  const seen = new Set<string>();
  const imgs: string[] = [];
  const push = (url?: string | null) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    imgs.push(trimmed);
  };
  for (const url of c.imageUrls ?? []) push(url);
  push(c.imageUrl);
  if (imgs.length === 0) push(c.imageUrl);
  return {
    name: c.name,
    nameUk: c.nameUk ?? null,
    hex: c.hex,
    image: imgs[0] ?? c.imageUrl,
    images: imgs,
    sizeImages: c.sizeImages ?? {},
    sizeStocks: c.sizeStocks ?? {},
    laceVariants: normalizeLaceVariants(c.laceVariants),
  };
}

function mapToFrontendProduct(d: ProductDto): Product {
  const colors: ColorVariant[] = d.colors && d.colors.length > 0
    ? d.colors.map(toColorVariant)
    : d.imageUrls.length > 0
    ? d.imageUrls.map((url, i) => ({ name: `Variant ${i + 1}`, hex: "#2D241E", image: url, images: [url] }))
    : d.primaryImageUrl
    ? [{ name: "Default", hex: "#2D241E", image: d.primaryImageUrl, images: [d.primaryImageUrl] }]
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
    sizes: d.sizes?.length ? d.sizes : ["XS", "S", "M", "L", "XL"],
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
  const image = s.primaryImageUrl ?? PLACEHOLDER;
  return {
    id: s.productCode,
    name: s.name,
    subtitle: s.categoryName,
    price: Number(s.price),
    category: s.categoryName,
    isNew: s.isNew,
    isBestseller: s.isBestseller,
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "",
    details: [],
    colors: [{ name: "Default", hex: "#2D241E", image, images: [image] }],
  };
}

function mapDetailToFrontend(d: ProductDetailDto): Product {
  const colors: ColorVariant[] = d.colors.map(toColorVariant);
  if (colors.length === 0 && d.primaryImageUrl) {
    colors.push({ name: "Default", hex: "#2D241E", image: d.primaryImageUrl, images: [d.primaryImageUrl] });
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
    sizes: d.sizes?.length ? d.sizes : ["XS", "S", "M", "L", "XL"],
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
