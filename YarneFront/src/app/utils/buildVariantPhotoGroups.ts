import type { DraftProductFormInput } from "./buildDraftProduct";
import { resolveMediaUrl } from "./storefrontMedia";

export type VariantPhotoEntry = {
  colorId: number;
  colorName: string;
  colorHex: string;
  sizeId: number;
  sizeName: string;
  lace: boolean;
  laceLabel: string;
  variantKey: string;
  photoIndex: number;
  url: string;
  resolvedUrl: string;
};

export type VariantPhotoGroup = {
  colorId: number;
  colorName: string;
  colorHex: string;
  photos: VariantPhotoEntry[];
};

function variantKey(colorId: number, sizeId: number, lace: boolean) {
  return `${colorId}:${sizeId}:${lace}`;
}

function isValidPhotoUrl(url: string): boolean {
  const trimmed = url.trim();
  return Boolean(trimmed) && !trimmed.startsWith("Upload failed:");
}

export function buildVariantPhotoGroups(
  form: DraftProductFormInput,
  colors: { id: number; name: string; hexCode: string }[],
  sizes: { id: number; name: string }[],
): VariantPhotoGroup[] {
  const groups: VariantPhotoGroup[] = [];

  if (form.colorIds.length === 0) {
    const fallbackPhotos = form.imageUrls.filter(isValidPhotoUrl);
    if (fallbackPhotos.length === 0) return [];
    return [
      {
        colorId: -1,
        colorName: "Default",
        colorHex: "#2D241E",
        photos: fallbackPhotos.map((url, photoIndex) => ({
          colorId: -1,
          colorName: "Default",
          colorHex: "#2D241E",
          sizeId: -1,
          sizeName: "—",
          lace: false,
          laceLabel: "",
          variantKey: "fallback",
          photoIndex,
          url,
          resolvedUrl: resolveMediaUrl(url) || url,
        })),
      },
    ];
  }

  for (const colorId of form.colorIds) {
    const catalog = colors.find((c) => c.id === colorId);
    const colorName = catalog?.name ?? "Color";
    const colorHex = catalog?.hexCode ?? "#2D241E";
    const photos: VariantPhotoEntry[] = [];
    const laceOptions: boolean[] = form.lace ? [false, true] : [false];

    for (const sizeId of form.colorSizeIds[colorId] ?? []) {
      const sizeName = sizes.find((s) => s.id === sizeId)?.name ?? "Size";
      for (const lace of laceOptions) {
        const key = variantKey(colorId, sizeId, lace);
        const urls = (form.colorSizeVariants[key] ?? []).filter(isValidPhotoUrl);
        urls.forEach((url, photoIndex) => {
          photos.push({
            colorId,
            colorName,
            colorHex,
            sizeId,
            sizeName,
            lace,
            laceLabel: lace ? "With strap" : "Without strap",
            variantKey: key,
            photoIndex,
            url,
            resolvedUrl: resolveMediaUrl(url) || url,
          });
        });
      }
    }

    if (photos.length > 0) {
      groups.push({ colorId, colorName, colorHex, photos });
    }
  }

  return groups;
}

export function findColorIndexById(
  colorGroups: VariantPhotoGroup[],
  draftColorNames: string[],
  colorId: number,
): number {
  const name = colorGroups.find((g) => g.colorId === colorId)?.colorName;
  if (!name) return 0;
  const idx = draftColorNames.findIndex((n) => n === name);
  return idx >= 0 ? idx : 0;
}
