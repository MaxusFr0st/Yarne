import type { ProductDto, ProductDetailDto } from "../api/products";

export type ProductsQuery = {
  category?: string;
  isNew?: boolean;
  collectionId?: number;
  includeInactive?: boolean;
};

type ListEntry = {
  data: ProductDto[];
  error: string | null;
  fetchedAt: number;
};

type DetailEntry = {
  data: ProductDetailDto | null;
  error: string | null;
  fetchedAt: number;
};

const LIST_TTL_MS = 5 * 60 * 1000;
const DETAIL_TTL_MS = 5 * 60 * 1000;

const listCache = new Map<string, ListEntry>();
const detailCache = new Map<string, DetailEntry>();
const listInflight = new Map<string, Promise<ListEntry>>();
const detailInflight = new Map<string, Promise<DetailEntry>>();

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeProductsCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function productsQueryKey(params?: ProductsQuery): string {
  return JSON.stringify({
    category: params?.category ?? null,
    isNew: params?.isNew ?? null,
    collectionId: params?.collectionId ?? null,
    includeInactive: params?.includeInactive ?? null,
  });
}

export function readProductsListCache(key: string): ListEntry | null {
  return listCache.get(key) ?? null;
}

export function readProductDetailCache(id: string): DetailEntry | null {
  return detailCache.get(id) ?? null;
}

function isFresh(fetchedAt: number, ttlMs: number): boolean {
  return fetchedAt > 0 && Date.now() - fetchedAt < ttlMs;
}

export async function loadProductsList(
  key: string,
  fetcher: () => Promise<ProductDto[]>,
  options?: { force?: boolean },
): Promise<ListEntry> {
  const cached = listCache.get(key);
  if (!options?.force && cached && isFresh(cached.fetchedAt, LIST_TTL_MS)) {
    return cached;
  }

  const inflight = listInflight.get(key);
  if (inflight) return inflight;

  const request = fetcher()
    .then((data) => {
      const entry: ListEntry = { data, error: null, fetchedAt: Date.now() };
      listCache.set(key, entry);
      notify();
      return entry;
    })
    .catch((e: unknown) => {
      const entry: ListEntry = {
        data: cached?.data ?? [],
        error: e instanceof Error ? e.message : "Failed to load products from API.",
        fetchedAt: cached?.fetchedAt ?? 0,
      };
      if (!cached) listCache.set(key, entry);
      notify();
      return entry;
    })
    .finally(() => {
      listInflight.delete(key);
    });

  listInflight.set(key, request);
  return request;
}

export async function loadProductDetail(
  id: string,
  fetcher: () => Promise<ProductDetailDto>,
  options?: { force?: boolean },
): Promise<DetailEntry> {
  const cached = detailCache.get(id);
  if (!options?.force && cached && cached.data && isFresh(cached.fetchedAt, DETAIL_TTL_MS)) {
    return cached;
  }

  const inflight = detailInflight.get(id);
  if (inflight) return inflight;

  const request = fetcher()
    .then((data) => {
      const entry: DetailEntry = { data, error: null, fetchedAt: Date.now() };
      detailCache.set(id, entry);
      notify();
      return entry;
    })
    .catch((e: unknown) => {
      const entry: DetailEntry = {
        data: null,
        error: e instanceof Error ? e.message : "Failed to load product from API.",
        fetchedAt: 0,
      };
      detailCache.set(id, entry);
      notify();
      return entry;
    })
    .finally(() => {
      detailInflight.delete(id);
    });

  detailInflight.set(id, request);
  return request;
}

export function invalidateProductsCache(): void {
  listCache.clear();
  detailCache.clear();
  notify();
}
