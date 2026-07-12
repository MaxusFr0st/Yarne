import type { Product } from "../types/product";
import { resolveMediaUrl } from "./storefrontMedia";

export type DraftProductFormInput = {
  name: string;
  subtitle: string;
  price: string;
  stock: string;
  isNew: boolean;
  isBestseller: boolean;
  lace: boolean;
  defaultColorId: number | null;
  defaultSizeId: number | null;
  colorIds: number[];
  colorSizeIds: Record<number, number[]>;
  colorSizeVariants: Record<string, string[]>;
  imageUrls: string[];
};

type CatalogColor = { id: number; name: string; hexCode: string };
type CatalogSize = { id: number; name: string };

function variantKey(colorId: number, sizeId: number, lace: boolean) {
  return `${colorId}:${sizeId}:${lace}`;
}

function firstImageForColor(
  form: DraftProductFormInput,
  colorId: number,
  sizes: CatalogSize[],
): string {
  const defaultSizeId =
    form.defaultSizeId ??
    form.colorSizeIds[colorId]?.[0] ??
    sizes.find((s) => s.name === "M")?.id ??
    sizes[0]?.id ??
    null;

  if (defaultSizeId != null) {
    const withoutLace = form.colorSizeVariants[variantKey(colorId, defaultSizeId, false)]?.[0];
    if (withoutLace?.trim()) return withoutLace;
    if (form.lace) {
      const withLace = form.colorSizeVariants[variantKey(colorId, defaultSizeId, true)]?.[0];
      if (withLace?.trim()) return withLace;
    }
  }

  for (const sizeId of form.colorSizeIds[colorId] ?? []) {
    const url = form.colorSizeVariants[variantKey(colorId, sizeId, false)]?.[0];
    if (url?.trim()) return url;
  }

  return "";
}

export function buildDraftProduct(
  form: DraftProductFormInput,
  colors: CatalogColor[],
  sizes: CatalogSize[],
  categoryName: string,
): Product {
  const selectedSizeNames = Array.from(
    new Set(form.colorIds.flatMap((colorId) => (form.colorSizeIds[colorId] ?? []).map((id) => sizes.find((s) => s.id === id)?.name).filter(Boolean) as string[])),
  );

  const defaultSizeName = form.defaultSizeId
    ? sizes.find((s) => s.id === form.defaultSizeId)?.name
    : undefined;

  const defaultColorName = form.defaultColorId
    ? colors.find((c) => c.id === form.defaultColorId)?.name
    : undefined;

  const productColors =
    form.colorIds.length > 0
      ? form.colorIds.map((colorId) => {
          const catalog = colors.find((c) => c.id === colorId);
          const primary = firstImageForColor(form, colorId, sizes);
          const allUrls = Object.entries(form.colorSizeVariants)
            .filter(([key]) => key.startsWith(`${colorId}:`))
            .flatMap(([, urls]) => urls.filter((u) => u.trim()));
          const images = allUrls.length > 0 ? allUrls : primary ? [primary] : [];
          const image = primary || images[0] || "";
          return {
            name: catalog?.name ?? "Color",
            hex: catalog?.hexCode ?? "#2D241E",
            image: resolveMediaUrl(image) || image,
            images: images.map((u) => resolveMediaUrl(u) || u),
          };
        })
      : form.imageUrls
          .filter((u) => u.trim())
          .map((url, index) => ({
            name: index === 0 ? "Default" : `Variant ${index + 1}`,
            hex: "#2D241E",
            image: resolveMediaUrl(url) || url,
            images: [resolveMediaUrl(url) || url],
          }));

  if (productColors.length === 0) {
    productColors.push({
      name: "Default",
      hex: "#2D241E",
      image: "",
      images: [],
    });
  }

  const parsedPrice = Number(form.price);
  const parsedStock = Number(form.stock);

  return {
    id: "preview-draft",
    name: form.name.trim() || "Product name",
    subtitle: form.subtitle.trim() || "Subtitle / material",
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    stock: Number.isFinite(parsedStock) ? parsedStock : 1,
    category: categoryName || "Collection",
    isNew: form.isNew,
    isBestseller: form.isBestseller,
    lace: form.lace,
    sizes: selectedSizeNames.length > 0 ? selectedSizeNames : sizes.map((s) => s.name).slice(0, 4),
    defaultSize: defaultSizeName,
    defaultColor: defaultColorName,
    description: "",
    details: [],
    colors: productColors,
  };
}
