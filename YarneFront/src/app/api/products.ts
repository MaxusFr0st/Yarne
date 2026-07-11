import { apiRequest } from "./client";

export interface LaceSizeVariantDto {
  withLaceImages: string[];
  withoutLaceImages: string[];
  withLaceStock: number;
  withoutLaceStock: number;
}

export interface ColorVariantDto {
  name: string;
  hex: string;
  imageUrl: string;
  imageUrls: string[];
  sizeImages?: Record<string, string[]>;
  sizeStocks?: Record<string, number>;
  laceVariants?: Record<string, LaceSizeVariantDto>;
}

export interface ProductDto {
  id: number;
  productCode: string;
  name: string;
  description: string | null;
  price: number;
  quantityInStock: number;
  material: string | null;
  primaryImageUrl: string | null;
  imageUrls: string[];
  colors?: ColorVariantDto[];
  sizes?: string[];
  defaultSize?: string | null;
  defaultColor?: string | null;
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
  sizes: string[];
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
  primaryImageUrl: string | null;
  categoryName: string;
  isNew: boolean;
  isBestseller: boolean;
}

export async function fetchProducts(params?: {
  category?: string;
  isNew?: boolean;
  collectionId?: number;
  includeInactive?: boolean;
}): Promise<ProductDto[]> {
  const sp = new URLSearchParams();
  if (params?.category) sp.set("category", params.category);
  if (params?.isNew !== undefined) sp.set("isNew", String(params.isNew));
  if (params?.collectionId !== undefined) sp.set("collectionId", String(params.collectionId));
  if (params?.includeInactive) sp.set("includeInactive", "true");
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

export interface VariantStockInput {
  colorId: number;
  sizeId: number;
  lace: boolean;
  quantityInStock: number;
}

export interface CreateProductRequest {
  productCode?: string;
  name: string;
  description?: string;
  price: number;
  quantityInStock?: number;
  material?: string;
  categoryId: number;
  collectionId?: number;
  producerName?: string;
  defaultSizeId?: number;
  defaultColorId?: number;
  sizeIds?: number[];
  imageUrls?: string[];
  colorIds?: number[];
  colorVariants?: ColorVariantInput[];
  colorSizeVariants?: ColorSizeVariantInput[];
  variantStocks?: VariantStockInput[];
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
