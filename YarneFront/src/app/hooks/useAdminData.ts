import { useState, useEffect, useCallback } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductDto,
  type CreateProductRequest,
  type UpdateProductRequest,
  type ColorVariantDto,
} from "../api/products";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  fetchColors,
  createColor,
  updateColor,
  deleteColor,
  fetchFurnitureColors,
  createFurnitureColor,
  updateFurnitureColor,
  deleteFurnitureColor,
  fetchSizes,
  createSize,
  updateSize,
  deleteSize,
  fetchUsers,
  type CategoryDto,
  type CountryDto,
  type ColorDto,
  type FurnitureColorDto,
  type SizeDto,
  type UserDto,
} from "../api/admin";
import { register } from "../api/auth";
import { fetchAdminOrders, fetchAdminOrdersSummary, updateOrderStatus, type OrderDto, type AdminOrdersSummaryDto, type OrderItemDto, type OrderStatus } from "../api/orders";
import { ApiRequestError } from "../api/errors";
import type { Product } from "../types/product";
import { normalizeLaceVariants } from "../utils/variantStock";
import { invalidateProductsCache } from "../utils/productsCache";
import { useApp } from "../context/AppContext";

function mapColorVariant(c: ColorVariantDto) {
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
  return {
    name: c.name,
    nameUk: c.nameUk ?? null,
    hex: c.hex,
    image: imgs[0] ?? c.imageUrl,
    images: imgs.length > 0 ? imgs : c.imageUrl ? [c.imageUrl] : [],
    sizeImages: c.sizeImages ?? {},
    sizeStocks: c.sizeStocks ?? {},
    laceVariants: normalizeLaceVariants(c.laceVariants),
  };
}

function mapProductDtoToProduct(d: ProductDto): Product & { idNum: number; sku: string; stock: number } {
  const colors = d.colors && d.colors.length > 0
    ? d.colors.map(mapColorVariant)
    : d.imageUrls.length > 0
    ? d.imageUrls.map((url, i) => ({ name: `Image ${i + 1}`, hex: "#2D241E", image: url, images: [url] }))
    : d.primaryImageUrl
    ? [{ name: "Default", hex: "#2D241E", image: d.primaryImageUrl, images: [d.primaryImageUrl] }]
    : [{ name: "Default", hex: "#2D241E", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3Cpath fill='%232D241E' fill-opacity='0.3' d='M80 200h240M200 80v240' stroke='%232D241E' stroke-opacity='0.2'/%3E%3C/svg%3E", images: ["data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3C/svg%3E"] }];

  return {
    id: d.productCode,
    idNum: d.id,
    name: d.name,
    subtitle: d.material ?? d.producerName ?? "",
    price: Number(d.price),
    category: d.categoryName,
    isNew: d.isNew ?? false,
    isBestseller: d.isBestseller ?? false,
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
    sku: d.productCode,
    stock: d.quantityInStock,
  } as Product & { idNum: number; sku: string; stock: number };
}

function mapUserDtoToAdminUser(u: UserDto): {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  joined: string;
  orders: number;
  totalSpent: number;
  status: "active" | "inactive";
} {
  return {
    id: String(u.id),
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: "customer",
    joined: new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    orders: 0,
    totalSpent: 0,
    status: u.isActive ? "active" : "inactive",
  };
}

function mapOrderDtoToAdminOrder(o: OrderDto): {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber: string | null;
  total: number;
  status: string;
  itemCount: number;
  orderDate: string;
  estimatedDelivery: string | null;
  paymentMethodName: string;
  items: OrderItemDto[];
} {
  return {
    id: o.id,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhoneNumber: o.customerPhoneNumber ?? null,
    total: Number(o.total),
    status: o.status,
    itemCount: o.items.length,
    orderDate: o.orderDate,
    estimatedDelivery: o.estimatedDelivery,
    paymentMethodName: o.paymentMethodName,
    items: o.items,
  };
}

const EMPTY_ORDERS_SUMMARY: AdminOrdersSummaryDto = {
  totalOrders: 0,
  totalRevenue: 0,
  pendingOrders: 0,
};

function formatLoadError(label: string, reason: unknown): string {
  if (reason instanceof ApiRequestError) {
    if (reason.status === 401 || reason.status === 403) {
      return `${label}: sign in again or confirm your account has Admin access.`;
    }
    if (reason.message === "An unexpected error occurred.") {
      return `${label}: server error — redeploy the mindful-flexibility API so database migrations can finish.`;
    }
    return `${label}: ${reason.message}`;
  }
  if (reason instanceof Error) {
    return `${label}: ${reason.message}`;
  }
  return `${label}: request failed.`;
}

export function useAdminData() {
  const { isAdmin } = useApp();
  const [products, setProducts] = useState<(Product & { idNum: number; sku: string; stock: number })[]>([]);
  const [users, setUsers] = useState<ReturnType<typeof mapUserDtoToAdminUser>[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [colors, setColors] = useState<ColorDto[]>([]);
  const [furnitureColors, setFurnitureColors] = useState<FurnitureColorDto[]>([]);
  const [sizes, setSizes] = useState<SizeDto[]>([]);
  const [orders, setOrders] = useState<ReturnType<typeof mapOrderDtoToAdminOrder>[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<AdminOrdersSummaryDto>(EMPTY_ORDERS_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const warnings: string[] = [];

    const catalogResults = await Promise.allSettled([
      fetchProducts({ includeInactive: true }),
      fetchCategories(),
      fetchCountries(),
      fetchColors(),
      fetchFurnitureColors(),
      fetchSizes(),
    ]);

    const [prodsResult, catsResult, ctrysResult, colsResult, furnitureResult, szsResult] = catalogResults;

    if (prodsResult.status === "fulfilled") {
      setProducts(prodsResult.value.map(mapProductDtoToProduct));
      setApiAvailable(true);
    } else {
      setProducts([]);
      setApiAvailable(false);
      warnings.push(formatLoadError("Products", prodsResult.reason));
    }

    if (catsResult.status === "fulfilled") {
      setCategories(catsResult.value);
    } else {
      setCategories([]);
      warnings.push(formatLoadError("Categories", catsResult.reason));
    }

    if (ctrysResult.status === "fulfilled") {
      setCountries(ctrysResult.value);
    } else {
      setCountries([]);
      warnings.push(formatLoadError("Countries", ctrysResult.reason));
    }

    if (colsResult.status === "fulfilled") {
      setColors(colsResult.value);
    } else {
      setColors([]);
      warnings.push(formatLoadError("Colors", colsResult.reason));
    }

    if (furnitureResult.status === "fulfilled") {
      setFurnitureColors(furnitureResult.value);
    } else {
      setFurnitureColors([]);
      warnings.push(formatLoadError("Furniture colors", furnitureResult.reason));
    }

    if (szsResult.status === "fulfilled") {
      setSizes(szsResult.value);
    } else {
      setSizes([]);
      warnings.push(formatLoadError("Sizes", szsResult.reason));
    }

    if (isAdmin) {
      const adminResults = await Promise.allSettled([
        fetchUsers(),
        fetchAdminOrders(),
        fetchAdminOrdersSummary(),
      ]);
      const [usrsResult, ordsResult, ordSummaryResult] = adminResults;

      if (usrsResult.status === "fulfilled") {
        setUsers(usrsResult.value.map(mapUserDtoToAdminUser));
      } else {
        setUsers([]);
        warnings.push(formatLoadError("Users", usrsResult.reason));
      }

      if (ordsResult.status === "fulfilled") {
        setOrders(ordsResult.value.map(mapOrderDtoToAdminOrder));
      } else {
        setOrders([]);
        warnings.push(formatLoadError("Orders", ordsResult.reason));
      }

      if (ordSummaryResult.status === "fulfilled") {
        setOrdersSummary(ordSummaryResult.value);
      } else {
        setOrdersSummary(EMPTY_ORDERS_SUMMARY);
        warnings.push(formatLoadError("Order summary", ordSummaryResult.reason));
      }
    } else {
      setUsers([]);
      setOrders([]);
      setOrdersSummary(EMPTY_ORDERS_SUMMARY);
    }

    setLoadWarnings(warnings);
    setLoading(false);
  }, [isAdmin]);

  const refetchOrders = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [ords, ordSummary] = await Promise.all([
        fetchAdminOrders(),
        fetchAdminOrdersSummary(),
      ]);
      setOrders(ords.map(mapOrderDtoToAdminOrder));
      setOrdersSummary(ordSummary);
      setLoadWarnings((prev) => prev.filter((w) => !w.startsWith("Orders:") && !w.startsWith("Order summary:")));
    } catch (e) {
      const msg = formatLoadError("Orders", e);
      setLoadWarnings((prev) => [...prev.filter((w) => !w.startsWith("Orders:") && !w.startsWith("Order summary:")), msg]);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const addProduct = useCallback(
    async (data: CreateProductRequest) => {
      const created = await createProduct(data);
      invalidateProductsCache();
      setProducts((prev) => [mapProductDtoToProduct(created), ...prev]);
      setApiAvailable(true);
      return created;
    },
    []
  );

  const editProduct = useCallback(
    async (id: number, data: UpdateProductRequest) => {
      const updated = await updateProduct(id, data);
      invalidateProductsCache();
      setProducts((prev) =>
        prev.map((p) => (p.idNum === id ? mapProductDtoToProduct(updated) : p))
      );
      setApiAvailable(true);
      return updated;
    },
    []
  );

  const removeProduct = useCallback(async (id: number) => {
    await deleteProduct(id);
    invalidateProductsCache();
    setProducts((prev) => prev.filter((p) => p.idNum !== id));
  }, []);

  const addCategory = useCallback(async (name: string) => {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const editCategory = useCallback(async (id: number, name: string) => {
    const updated = await updateCategory(id, name);
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }, []);

  const removeCategory = useCallback(async (id: number) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addCountry = useCallback(async (name: string) => {
    const created = await createCountry(name);
    setCountries((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const editCountry = useCallback(async (id: number, name: string) => {
    const updated = await updateCountry(id, name);
    setCountries((prev) =>
      prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }, []);

  const removeCountry = useCallback(async (id: number) => {
    await deleteCountry(id);
    setCountries((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addColor = useCallback(async (name: string, hexCode?: string, nameUk?: string) => {
    const created = await createColor(name, hexCode, nameUk);
    setColors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const editColor = useCallback(async (id: number, name: string, hexCode?: string, nameUk?: string) => {
    const updated = await updateColor(id, name, hexCode, nameUk);
    setColors((prev) =>
      prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }, []);

  const removeColor = useCallback(async (id: number) => {
    await deleteColor(id);
    setColors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addFurnitureColor = useCallback(async (name: string, hexCode?: string, nameUk?: string) => {
    const created = await createFurnitureColor(name, hexCode, nameUk);
    setFurnitureColors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const editFurnitureColor = useCallback(async (id: number, name: string, hexCode?: string, nameUk?: string) => {
    const updated = await updateFurnitureColor(id, name, hexCode, nameUk);
    setFurnitureColors((prev) =>
      prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }, []);

  const removeFurnitureColor = useCallback(async (id: number) => {
    await deleteFurnitureColor(id);
    setFurnitureColors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addSize = useCallback(async (name: string) => {
    const created = await createSize(name);
    setSizes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const editSize = useCallback(async (id: number, name: string) => {
    const updated = await updateSize(id, name);
    setSizes((prev) =>
      prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }, []);

  const removeSize = useCallback(async (id: number) => {
    await deleteSize(id);
    setSizes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addUser = useCallback(async (data: { firstName: string; lastName: string; userName: string; email: string; password: string }) => {
    const res = await register(data);
    await load();
    return res;
  }, [load]);

  const setOrderStatus = useCallback(async (id: number, status: OrderStatus, estimatedDelivery?: string | null) => {
    const updated = await updateOrderStatus(id, { status, estimatedDelivery });
    const mapped = mapOrderDtoToAdminOrder(updated);
    setOrders((prev) => prev.map((o) => (o.id === id ? mapped : o)));
    return updated;
  }, []);

  return {
    products,
    users,
    categories,
    countries,
    loading,
    apiAvailable,
    loadWarnings,
    refetch: load,
    refetchOrders,
    addProduct,
    editProduct,
    removeProduct,
    addCategory,
    editCategory,
    removeCategory,
    addCountry,
    editCountry,
    removeCountry,
    colors,
    addColor,
    editColor,
    removeColor,
    furnitureColors,
    addFurnitureColor,
    editFurnitureColor,
    removeFurnitureColor,
    sizes,
    addSize,
    editSize,
    removeSize,
    orders,
    ordersSummary,
    setOrderStatus,
    addUser,
  };
}
