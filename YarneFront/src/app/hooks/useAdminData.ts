import { useState, useEffect, useCallback } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductDto,
  type CreateProductRequest,
  type UpdateProductRequest,
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
  fetchSizes,
  createSize,
  updateSize,
  deleteSize,
  fetchUsers,
  type CategoryDto,
  type CountryDto,
  type ColorDto,
  type SizeDto,
  type UserDto,
} from "../api/admin";
import { register } from "../api/auth";
import { fetchAdminOrders, fetchAdminOrdersSummary, updateOrderStatus, type OrderDto, type AdminOrdersSummaryDto } from "../api/orders";
import type { Product } from "../types/product";

function mapProductDtoToProduct(d: ProductDto): Product & { idNum: number; sku: string; stock: number } {
  const colors = d.colors && d.colors.length > 0
    ? d.colors.map((c) => {
        const imgs = c.imageUrls?.length ? c.imageUrls : [c.imageUrl];
        return { name: c.name, hex: c.hex, image: c.imageUrl, images: imgs, sizeImages: c.sizeImages ?? {}, sizeStocks: c.sizeStocks ?? {} };
      })
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
    isNew: false,
    isBestseller: false,
    sizes: d.sizes?.length ? d.sizes : ["XS", "S", "M", "L", "XL"],
    defaultSize: d.defaultSize ?? undefined,
    description: d.description ?? "",
    details: [],
    colors,
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
  total: number;
  status: string;
  itemCount: number;
  orderDate: string;
  estimatedDelivery: string | null;
  paymentMethodName: string;
} {
  return {
    id: o.id,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    total: Number(o.total),
    status: o.status,
    itemCount: o.items.length,
    orderDate: o.orderDate,
    estimatedDelivery: o.estimatedDelivery,
    paymentMethodName: o.paymentMethodName,
  };
}

export function useAdminData() {
  const [products, setProducts] = useState<(Product & { idNum: number; sku: string; stock: number })[]>([]);
  const [users, setUsers] = useState<ReturnType<typeof mapUserDtoToAdminUser>[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [colors, setColors] = useState<ColorDto[]>([]);
  const [sizes, setSizes] = useState<SizeDto[]>([]);
  const [orders, setOrders] = useState<ReturnType<typeof mapOrderDtoToAdminOrder>[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<AdminOrdersSummaryDto>({ totalOrders: 0, totalRevenue: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, usrs, cats, ctrys, cols, szs, ords, ordSummary] = await Promise.all([
        fetchProducts({ includeInactive: true }),
        fetchUsers(),
        fetchCategories(),
        fetchCountries(),
        fetchColors(),
        fetchSizes(),
        fetchAdminOrders(),
        fetchAdminOrdersSummary(),
      ]);
      setProducts(prods.map(mapProductDtoToProduct));
      setUsers(usrs.map(mapUserDtoToAdminUser));
      setCategories(cats);
      setCountries(ctrys);
      setColors(cols);
      setSizes(szs);
      setOrders(ords.map(mapOrderDtoToAdminOrder));
      setOrdersSummary(ordSummary);
      setApiAvailable(true);
    } catch {
      setProducts([]);
      setUsers([]);
      setCategories([]);
      setCountries([]);
      setColors([]);
      setSizes([]);
      setOrders([]);
      setOrdersSummary({ totalOrders: 0, totalRevenue: 0, pendingOrders: 0 });
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addProduct = useCallback(
    async (data: CreateProductRequest) => {
      const created = await createProduct(data);
      setProducts((prev) => [mapProductDtoToProduct(created), ...prev]);
      return created;
    },
    []
  );

  const editProduct = useCallback(
    async (id: number, data: UpdateProductRequest) => {
      const updated = await updateProduct(id, data);
      setProducts((prev) =>
        prev.map((p) => (p.idNum === id ? mapProductDtoToProduct(updated) : p))
      );
      return updated;
    },
    []
  );

  const removeProduct = useCallback(async (id: number) => {
    await deleteProduct(id);
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

  const addColor = useCallback(async (name: string, hexCode?: string) => {
    const created = await createColor(name, hexCode);
    setColors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const editColor = useCallback(async (id: number, name: string, hexCode?: string) => {
    const updated = await updateColor(id, name, hexCode);
    setColors((prev) =>
      prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }, []);

  const removeColor = useCallback(async (id: number) => {
    await deleteColor(id);
    setColors((prev) => prev.filter((c) => c.id !== id));
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

  const setOrderStatus = useCallback(async (id: number, status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled", estimatedDelivery?: string | null) => {
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
    refetch: load,
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
