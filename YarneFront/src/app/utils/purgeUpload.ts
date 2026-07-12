import { deleteUploadedImage } from "../api/images";
import { normalizeStoredMediaUrl } from "./storefrontMedia";

/** Best-effort server cleanup when admin removes an uploaded image from the UI. */
export function purgeUploadIfOrphaned(url: string | undefined | null): void {
  const normalized = normalizeStoredMediaUrl((url ?? "").trim());
  if (!normalized.startsWith("/uploads/")) return;

  void deleteUploadedImage(normalized).catch((err) => {
    console.warn("Could not delete upload from server:", normalized, err);
  });
}
