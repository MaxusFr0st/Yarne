import { apiRequest } from "./client";

export interface CollectionDto {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  productCount?: number;
}

export interface CollectionDetailDto extends CollectionDto {
  productIds: number[];
}

export interface CreateCollectionRequest {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}

export async function fetchCollections(): Promise<CollectionDto[]> {
  return apiRequest<CollectionDto[]>("/api/collections");
}

export async function fetchCollection(id: number): Promise<CollectionDetailDto> {
  return apiRequest<CollectionDetailDto>(`/api/collections/${id}`);
}

export async function createCollection(data: CreateCollectionRequest): Promise<CollectionDto> {
  return apiRequest<CollectionDto>("/api/collections", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCollection(id: number, data: CreateCollectionRequest): Promise<CollectionDto> {
  return apiRequest<CollectionDto>(`/api/collections/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCollection(id: number): Promise<void> {
  await apiRequest(`/api/collections/${id}`, { method: "DELETE" });
}

export async function setCollectionProducts(id: number, productIds: number[]): Promise<CollectionDetailDto> {
  return apiRequest<CollectionDetailDto>(`/api/collections/${id}/products`, {
    method: "PUT",
    body: JSON.stringify({ productIds }),
  });
}
