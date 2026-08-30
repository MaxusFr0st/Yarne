export interface ProductImage {
  src: string;
  focalX: number;
  focalY: number;
}

export interface LaceSizeVariant {
  withLaceImages: ProductImage[];
  withoutLaceImages: ProductImage[];
}

export interface ColorVariant {
  colorId?: number;
  name: string;
  nameUk?: string | null;
  hex: string;
  price?: number;
  priceWithLace?: number;
  eurPrice?: number;
  eurPriceWithLace?: number;
  image: ProductImage;
  images: ProductImage[];
  sizeImages?: Record<string, ProductImage[]>;
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
  eurPrice?: number;
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
  /** Dedicated photo for link-share previews and order emails. Null/undefined = falls back to the primary product image. */
  shareImageUrl?: string | null;
}
