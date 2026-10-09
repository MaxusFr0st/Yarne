import type { Product } from "../types/product";

type Localizable = Pick<Product, "name" | "description" | "material" | "category"> &
  Partial<Pick<Product, "nameEn" | "descriptionEn" | "materialEn" | "categoryEn">>;

const pick = (locale: string, base: string | null | undefined, en: string | null | undefined): string =>
  (locale === "en" && en && en.trim() ? en : base) ?? "";

/** English text when the visitor reads English and the owner has written it; the Ukrainian text otherwise. */
export const productName = (p: Localizable, locale: string) => pick(locale, p.name, p.nameEn);
export const productDescription = (p: Localizable, locale: string) => pick(locale, p.description, p.descriptionEn);
export const productMaterial = (p: Localizable, locale: string) => pick(locale, p.material, p.materialEn);
export const productCategory = (p: Localizable, locale: string) => pick(locale, p.category, p.categoryEn);
