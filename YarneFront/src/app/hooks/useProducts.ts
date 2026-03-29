import { useState, useEffect, useCallback } from "react";
import { fetchProducts, fetchProduct, type ProductDto, type ProductDetailDto } from "../api/products";
import { PRODUCTS } from "../data/products";
import type { Product, ColorVariant } from "../data/products";

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3Cpath fill='%232D241E' fill-opacity='0.3' d='M80 200h240M200 80v240' stroke='%232D241E' stroke-opacity='0.2'/%3E%3C/svg%3E";

function toColorVariant(c: { name: string; hex: string; imageUrl: string; imageUrls?: string[] }): ColorVariant {
  const imgs = c.imageUrls?.length ? c.imageUrls : [c.imageUrl];
  return {
    name: c.name,
    hex: c.hex,
    image: c.imageUrl,
    images: imgs,
    sizeImages: (c as { sizeImages?: Record<string, string[]> }).sizeImages ?? {},
    sizeStocks: (c as { sizeStocks?: Record<string, number> }).sizeStocks ?? {},
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
    isNew: d.createdAt ? new Date(d.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false,
    isBestseller: false,
    sizes: d.sizes?.length ? d.sizes : ["XS", "S", "M", "L", "XL"],
    defaultSize: d.defaultSize ?? undefined,
    description: d.description ?? "",
    details: [],
    colors,
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
    sizes: d.sizes?.length ? d.sizes : ["XS", "S", "M", "L", "XL"],
    defaultSize: d.defaultSize ?? undefined,
    description: d.description ?? "",
    details: d.details,
    colors,
  };
}

export function useProducts(
  params?: { category?: string; isNew?: boolean; includeInactive?: boolean }
) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromApi, setFromApi] = useState(false);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchProducts(params)
      .then((data) => {
        setProducts(data.map(mapToFrontendProduct));
        setFromApi(true);
      })
      .catch(() => {
        setProducts(PRODUCTS);
        setFromApi(false);
      })
      .finally(() => setLoading(false));
  }, [params?.category, params?.isNew, params?.includeInactive]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { products, loading, error, fromApi, refetch };
}

export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchProduct(id)
      .then((data) => setProduct(mapDetailToFrontend(data)))
      .catch(() => {
        const fallback = PRODUCTS.find((p) => p.id === id);
        setProduct(fallback ?? null);
        setError(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }
    load();
  }, [load, id]);

  return { product, loading, error, refetch: load };
}
