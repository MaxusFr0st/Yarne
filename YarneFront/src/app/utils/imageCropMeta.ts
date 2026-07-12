import type { Area } from "react-easy-crop";
import { normalizeStoredMediaUrl } from "./storefrontMedia";

export type ImageCropMeta = {
  /** Full uncropped upload used as the crop source */
  sourceUrl: string;
  croppedAreaPixels?: Area;
  zoom?: number;
  crop?: { x: number; y: number };
};

export type CropResultSettings = {
  croppedAreaPixels: Area;
  zoom: number;
  crop: { x: number; y: number };
};

export const MIN_CROP_ZOOM = 0.5;
export const MAX_CROP_ZOOM = 3;
export const DEFAULT_PRODUCT_CARD_CROP_HINT =
  "Crop ratio matches the storefront product card (3:4). Re-crop opens the original photo so you can zoom out and show more of the image.";

export function clampCropZoom(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 1;
  return Math.min(MAX_CROP_ZOOM, Math.max(MIN_CROP_ZOOM, value));
}

const STORAGE_PREFIX = "yarne:image-crop-meta:";

function metaKey(url: string): string {
  return normalizeStoredMediaUrl(url) || url.trim();
}

export function loadImageCropMeta(storageId: string | number): Record<string, ImageCropMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${storageId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ImageCropMeta>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function persistImageCropMeta(storageId: string | number, meta: Record<string, ImageCropMeta>): void {
  if (typeof window === "undefined") return;
  const key = `${STORAGE_PREFIX}${storageId}`;
  if (Object.keys(meta).length === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(meta));
}

export function resolveCropSourceUrl(
  displayUrl: string,
  metaByDisplayUrl: Record<string, ImageCropMeta>,
): string {
  const key = metaKey(displayUrl);
  return metaByDisplayUrl[key]?.sourceUrl ?? displayUrl;
}

export function getCropMetaForDisplayUrl(
  displayUrl: string,
  metaByDisplayUrl: Record<string, ImageCropMeta>,
): ImageCropMeta | undefined {
  return metaByDisplayUrl[metaKey(displayUrl)];
}

export function buildCropMetaEntry(
  sourceUrl: string,
  settings: CropResultSettings,
): ImageCropMeta {
  return {
    sourceUrl: metaKey(sourceUrl),
    croppedAreaPixels: settings.croppedAreaPixels,
    zoom: settings.zoom,
    crop: settings.crop,
  };
}

export function setImageCropMeta(
  prev: Record<string, ImageCropMeta>,
  displayUrl: string,
  entry: ImageCropMeta,
): Record<string, ImageCropMeta> {
  return { ...prev, [metaKey(displayUrl)]: entry };
}

export function transferImageCropMeta(
  prev: Record<string, ImageCropMeta>,
  oldDisplayUrl: string,
  newDisplayUrl: string,
  settings: CropResultSettings,
): Record<string, ImageCropMeta> {
  const oldKey = metaKey(oldDisplayUrl);
  const existing = prev[oldKey];
  const next = { ...prev };
  delete next[oldKey];
  next[metaKey(newDisplayUrl)] = {
    sourceUrl: existing?.sourceUrl ?? metaKey(oldDisplayUrl),
    ...buildCropMetaEntry(existing?.sourceUrl ?? oldDisplayUrl, settings),
  };
  return next;
}

export function removeImageCropMeta(
  prev: Record<string, ImageCropMeta>,
  displayUrl: string,
): Record<string, ImageCropMeta> {
  const key = metaKey(displayUrl);
  if (!prev[key]) return prev;
  const next = { ...prev };
  delete next[key];
  return next;
}
