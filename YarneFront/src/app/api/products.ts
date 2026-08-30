import { apiRequest } from "./client";

export interface ProductImageDto {
  src: string;
  focalX: number;
  focalY: number;
}

export interface LaceSizeVariantDto {
  withLaceImages: ProductImageDto[];
  withoutLaceImages: ProductImageDto[];
}

export interface ColorVariantDto {
  colorId?: number | null;
  name: string;
  nameUk?: string | null;
  hex: string;
  price?: number | null;
  priceWithLace?: number | null;
  eurPrice?: number | null;
  eurPriceWithLace?: number | null;
  image: ProductImageDto;
  images: ProductImageDto[];
  sizeImages?: Record<string, ProductImageDto[]>;
  laceVariants?: Record<string, LaceSizeVariantDto>;
}

export interface FurnitureColorVariantDto {
  name: string;
  nameUk?: string | null;
  hex: string;
}

export interface SizeOptionDto {
  name: string;
  nameUk?: string | null;
}

export interface ProductDto {
  id: number;
  productCode: string;
  name: string;
  description: string | null;
  price: number;
  eurPrice?: number | null;
  material: string | null;
  primaryImage: ProductImageDto | null;
  /** Dedicated photo for link-share previews and order emails. Null = falls back to primaryImage. */
  shareImageUrl?: string | null;
  images: ProductImageDto[];
  colors?: ColorVariantDto[];
  furnitureColors?: FurnitureColorVariantDto[];
  sizes?: SizeOptionDto[];
  defaultSize?: string | null;
  defaultColor?: string | null;
  defaultFurnitureColor?: string | null;
  categoryName: string;
  collectionName: string | null;
  producerName: string | null;
  isActive: boolean;
  isNew: boolean;
  isBestseller: boolean;
  lace: boolean;
  createdAt: string;
}

export interface ProductDetailDto extends ProductDto {
  subtitle: string | null;
  isNew: boolean;
  isBestseller: boolean;
  sizes: SizeOptionDto[];
  details: string[];
  colors: ColorVariantDto[];
  suggestedProductCodes: string[];
  suggestedProducts: SuggestedProductDto[];
  hasConfiguredSuggestions: boolean;
}

export interface SuggestedProductDto {
  productCode: string;
  name: string;
  price: number;
  eurPrice?: number | null;
  primaryImage: ProductImageDto | null;
  categoryName: string;
  isNew: boolean;
  isBestseller: boolean;
  defaultColorName: string | null;
  colors: ColorVariantDto[];
}

export async function fetchProducts(params?: {
  category?: string;
  isNew?: boolean;
  collectionId?: number;
  includeInactive?: boolean;
  includeInternal?: boolean;
}): Promise<ProductDto[]> {
  const sp = new URLSearchParams();
  if (params?.category) sp.set("category", params.category);
  if (params?.isNew !== undefined) sp.set("isNew", String(params.isNew));
  if (params?.collectionId !== undefined) sp.set("collectionId", String(params.collectionId));
  if (params?.includeInactive) sp.set("includeInactive", "true");
  if (params?.includeInternal) sp.set("includeInternal", "true");
  const qs = sp.toString();
  return apiRequest<ProductDto[]>(`/api/products${qs ? `?${qs}` : ""}`);
}

export async function fetchProduct(idOrCode: string): Promise<ProductDetailDto> {
  return apiRequest<ProductDetailDto>(`/api/products/${encodeURIComponent(idOrCode)}`);
}

export interface ColorVariantInput {
  colorId: number;
  imageUrls: string[];
}

export interface ColorSizeVariantInput {
  colorId: number;
  sizeId: number;
  lace: boolean;
  imageUrls: string[];
}

export interface ColorPriceInput {
  colorId: number;
  price?: number;
  priceWithLace?: number;
  eurPrice?: number;
  eurPriceWithLace?: number;
}

export interface CreateProductRequest {
  productCode?: string;
  name: string;
  description?: string;
  price: number;
  eurPrice?: number;
  material?: string;
  categoryId: number;
  collectionId?: number;
  producerName?: string;
  defaultSizeId?: number;
  defaultColorId?: number;
  defaultFurnitureColorId?: number;
  sizeIds?: number[];
  imageUrls?: string[];
  colorIds?: number[];
  furnitureColorIds?: number[];
  colorVariants?: ColorVariantInput[];
  colorSizeVariants?: ColorSizeVariantInput[];
  colorPrices?: ColorPriceInput[];
  isNew?: boolean;
  isBestseller?: boolean;
  lace?: boolean;
  suggestedProductCodes?: string[];
}

export interface UpdateProductRequest extends CreateProductRequest {
  productCode: string;
  isActive?: boolean;
}

export async function createProduct(data: CreateProductRequest): Promise<ProductDto> {
  return apiRequest<ProductDto>("/api/products", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      imageUrls: data.imageUrls ?? [],
      colorIds: data.colorIds ?? [],
      furnitureColorIds: data.furnitureColorIds ?? [],
      colorVariants: data.colorVariants ?? [],
    }),
  });
}

export async function updateProduct(id: number, data: UpdateProductRequest): Promise<ProductDto> {
  return apiRequest<ProductDto>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  await apiRequest(`/api/products/${id}`, { method: "DELETE" });
}

export async function updateFocalPoint(imageUrl: string, focalX: number, focalY: number): Promise<{ updated: number; focalX: number; focalY: number }> {
  return apiRequest<{ updated: number; focalX: number; focalY: number }>("/api/images/focal-point", {
    method: "PATCH",
    body: JSON.stringify({ imageUrl, focalX, focalY }),
  });
}

/** Uploads the product's dedicated photo for link-share previews and order emails (stored in R2). */
export async function uploadProductShareImage(id: number, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  const result = await apiRequest<{ shareImageUrl: string }>(`/api/products/${id}/share-image`, {
    method: "POST",
    body: formData,
  });
  return result.shareImageUrl;
}

export async function deleteProductShareImage(id: number): Promise<void> {
  await apiRequest(`/api/products/${id}/share-image`, { method: "DELETE" });
}
