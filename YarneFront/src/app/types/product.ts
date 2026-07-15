export interface ProductImage {
  src: string;
  focalX: number;
  focalY: number;
}

export interface LaceSizeVariant {
  withLaceImages: ProductImage[];
  withoutLaceImages: ProductImage[];
  withLaceStock: number;
  withoutLaceStock: number;
}

export interface ColorVariant {
  name: string;
  nameUk?: string | null;
  hex: string;
  image: ProductImage;
  images: ProductImage[];
  sizeImages?: Record<string, ProductImage[]>;
  sizeStocks?: Record<string, number>;
  laceVariants?: Record<string, LaceSizeVariant>;
}

export interface FurnitureColorVariant {
  name: string;
  nameUk?: string | null;
  hex: string;
}

export interface SizeOption {
  name: string;
  nameUk?: string | null;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  stock?: number;
  category: string;
  isNew?: boolean;
  isBestseller?: boolean;
  createdAt?: string;
  lace?: boolean;
  sizes: SizeOption[];
  defaultSize?: string;
  defaultColor?: string;
  defaultFurnitureColor?: string;
  description: string;
  details: string[];
  colors: ColorVariant[];
  furnitureColors?: FurnitureColorVariant[];
  suggestedProductCodes?: string[];
  suggestedProducts?: Product[];
  hasConfiguredSuggestions?: boolean;
  producerName?: string;
}
