export interface LaceSizeVariant {
  withLaceImages: string[];
  withoutLaceImages: string[];
  withLaceStock: number;
  withoutLaceStock: number;
}

export interface ColorVariant {
  name: string;
  hex: string;
  image: string;
  images: string[];
  sizeImages?: Record<string, string[]>;
  sizeStocks?: Record<string, number>;
  laceVariants?: Record<string, LaceSizeVariant>;
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
  lace?: boolean;
  sizes: string[];
  defaultSize?: string;
  defaultColor?: string;
  description: string;
  details: string[];
  colors: ColorVariant[];
}
