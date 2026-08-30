import { apiRequest } from "./client";

export interface CityDto {
  ref: string;
  name: string;
}

export interface WarehouseDto {
  ref: string;
  cityRef: string;
  description: string;
  shortAddress: string;
  number: string;
}

export async function fetchCities(): Promise<CityDto[]> {
  return apiRequest<CityDto[]>("/api/shipping/cities");
}

export async function fetchWarehouses(cityRef: string): Promise<WarehouseDto[]> {
  return apiRequest<WarehouseDto[]>(`/api/shipping/warehouses?cityRef=${encodeURIComponent(cityRef)}`);
}
