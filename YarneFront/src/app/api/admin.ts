import { apiRequest } from "./client";

export interface CategoryDto {
  id: number;
  name: string;
}

export interface CountryDto {
  id: number;
  name: string;
}

export interface ColorDto {
  id: number;
  name: string;
  nameUk?: string | null;
  hexCode: string;
}

export interface FurnitureColorDto {
  id: number;
  name: string;
  nameUk?: string | null;
  hexCode: string;
}

export interface SizeDto {
  id: number;
  name: string;
}

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
}

export async function fetchCategories(): Promise<CategoryDto[]> {
  const data = await apiRequest<{ id: number; name: string }[]>("/api/categories");
  return Array.isArray(data) ? data : [];
}

export async function createCategory(name: string): Promise<CategoryDto> {
  const data = await apiRequest<{ id: number; name: string }>("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data;
}

export async function updateCategory(id: number, name: string): Promise<CategoryDto> {
  const data = await apiRequest<{ id: number; name: string }>(`/api/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiRequest(`/api/categories/${id}`, { method: "DELETE" });
}

export async function fetchCountries(): Promise<CountryDto[]> {
  const data = await apiRequest<{ id: number; name: string }[]>("/api/countries");
  return Array.isArray(data) ? data : [];
}

export async function createCountry(name: string): Promise<CountryDto> {
  const data = await apiRequest<{ id: number; name: string }>("/api/countries", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data;
}

export async function updateCountry(id: number, name: string): Promise<CountryDto> {
  const data = await apiRequest<{ id: number; name: string }>(`/api/countries/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
  return data;
}

export async function deleteCountry(id: number): Promise<void> {
  await apiRequest(`/api/countries/${id}`, { method: "DELETE" });
}

export async function fetchColors(): Promise<ColorDto[]> {
  const data = await apiRequest<ColorDto[]>("/api/colors");
  return Array.isArray(data) ? data : [];
}

export async function createColor(name: string, hexCode?: string, nameUk?: string): Promise<ColorDto> {
  return apiRequest<ColorDto>("/api/colors", {
    method: "POST",
    body: JSON.stringify({ name, nameUk: nameUk || null, hexCode: hexCode ?? "#2D241E" }),
  });
}

export async function updateColor(id: number, name: string, hexCode?: string, nameUk?: string): Promise<ColorDto> {
  return apiRequest<ColorDto>(`/api/colors/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, nameUk: nameUk || null, hexCode: hexCode ?? "#2D241E" }),
  });
}

export async function deleteColor(id: number): Promise<void> {
  await apiRequest(`/api/colors/${id}`, { method: "DELETE" });
}

export async function fetchFurnitureColors(): Promise<FurnitureColorDto[]> {
  const data = await apiRequest<FurnitureColorDto[]>("/api/furniture-colors");
  return Array.isArray(data) ? data : [];
}

export async function createFurnitureColor(name: string, hexCode?: string, nameUk?: string): Promise<FurnitureColorDto> {
  return apiRequest<FurnitureColorDto>("/api/furniture-colors", {
    method: "POST",
    body: JSON.stringify({ name, nameUk: nameUk || null, hexCode: hexCode ?? "#2D241E" }),
  });
}

export async function updateFurnitureColor(id: number, name: string, hexCode?: string, nameUk?: string): Promise<FurnitureColorDto> {
  return apiRequest<FurnitureColorDto>(`/api/furniture-colors/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, nameUk: nameUk || null, hexCode: hexCode ?? "#2D241E" }),
  });
}

export async function deleteFurnitureColor(id: number): Promise<void> {
  await apiRequest(`/api/furniture-colors/${id}`, { method: "DELETE" });
}

export async function fetchSizes(): Promise<SizeDto[]> {
  const data = await apiRequest<{ id: number; name: string }[]>("/api/sizes");
  return Array.isArray(data) ? data : [];
}

export async function createSize(name: string): Promise<SizeDto> {
  const data = await apiRequest<{ id: number; name: string }>("/api/sizes", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data;
}

export async function updateSize(id: number, name: string): Promise<SizeDto> {
  const data = await apiRequest<{ id: number; name: string }>(`/api/sizes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
  return data;
}

export async function deleteSize(id: number): Promise<void> {
  await apiRequest(`/api/sizes/${id}`, { method: "DELETE" });
}

export async function fetchUsers(): Promise<UserDto[]> {
  return apiRequest<UserDto[]>("/api/users");
}

export interface AdminActivityLogDto {
  id: number;
  category: string;
  action: string;
  entityId: string | null;
  entityLabel: string | null;
  summary: string;
  detailsJson: string | null;
  actorUserId: number | null;
  actorEmail: string | null;
  createdAt: string;
}

export async function fetchActivityLogs(params?: {
  category?: "product" | "user" | "push" | "order" | "catalog" | "image";
  limit?: number;
  offset?: number;
}): Promise<AdminActivityLogDto[]> {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const data = await apiRequest<AdminActivityLogDto[]>(
    `/api/admin/activity-logs${qs ? `?${qs}` : ""}`
  );
  return Array.isArray(data) ? data : [];
}
