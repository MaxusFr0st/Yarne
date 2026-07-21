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
  colorId?: number;
  name: string;
  nameUk?: string | null;
  hex: string;
  image: ProductImage;
  images: ProductImage[];
  sizeImages?: Record<string, ProductImage[]>;
  sizeStocks?: Record<string, number>;
  laceVariants?: Record<string, LaceSizeVariant>;
}

export interface LaceColorOption {
  colorId: number;
  colorName: string;
  colorNameUk?: string | null;
  colorHex: string;
  surcharge: number;
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
  categoryTrackStock?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  createdAt?: string;
  lace?: boolean;
  isInternalComponent?: boolean;
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
  laceSurcharge?: number;
  laceColorOptions?: LaceColorOption[];
}
