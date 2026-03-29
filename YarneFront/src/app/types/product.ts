export interface ColorVariant {
  name: string;
  hex: string;
  image: string;
  images: string[];
  sizeImages?: Record<string, string[]>;
  sizeStocks?: Record<string, number>;
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
  sizes: string[];
  defaultSize?: string;
  description: string;
  details: string[];
  colors: ColorVariant[];
}
