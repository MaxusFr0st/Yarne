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
  const data = await apiRequest<{ id: number; name: string; hexCode: string }[]>("/api/colors");
  return Array.isArray(data) ? data : [];
}

export async function createColor(name: string, hexCode?: string): Promise<ColorDto> {
  const data = await apiRequest<{ id: number; name: string; hexCode: string }>("/api/colors", {
    method: "POST",
    body: JSON.stringify({ name, hexCode: hexCode ?? "#2D241E" }),
  });
  return data;
}

export async function updateColor(id: number, name: string, hexCode?: string): Promise<ColorDto> {
  const data = await apiRequest<{ id: number; name: string; hexCode: string }>(`/api/colors/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, hexCode: hexCode ?? "#2D241E" }),
  });
  return data;
}

export async function deleteColor(id: number): Promise<void> {
  await apiRequest(`/api/colors/${id}`, { method: "DELETE" });
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
