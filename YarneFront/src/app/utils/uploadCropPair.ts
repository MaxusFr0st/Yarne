import { uploadImage } from "../api/images";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

function fileExtension(name: string): string {
  const match = name.match(/(\.[^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

/** Backend only accepts specific extensions and MIME types — normalize before upload. */
export function toUploadableCroppedFile(blob: Blob, baseName: string): File {
  if (blob.size === 0) {
    throw new Error("Cropped image is empty. Adjust the crop area and try again.");
  }
  const safeBase = baseName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${safeBase}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

function ensureCroppedUploadFile(croppedFile: File): File {
  if (croppedFile.size === 0) {
    throw new Error("Cropped image is empty. Adjust the crop area and try again.");
  }
  const ext = fileExtension(croppedFile.name);
  const type = (croppedFile.type || "").toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    if (type === "image/jpeg" || type === "image/jpg" || type === "" || type === "application/octet-stream") {
      return new File([croppedFile], croppedFile.name.endsWith(".jpg") || croppedFile.name.endsWith(".jpeg")
        ? croppedFile.name
        : `${croppedFile.name.replace(/\.[^.]+$/, "") || "image"}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  }
  return toUploadableCroppedFile(croppedFile, croppedFile.name.replace(/\.[^.]+$/, "") || "image");
}

export type CropUploadUrls = {
  displayUrl: string;
  sourceUrl: string;
  originalStored: boolean;
};

/**
 * Upload the cropped JPEG — same single-request flow that worked before the
 * dual-upload regression. Original file is kept only for local crop metadata.
 */
export async function uploadCroppedWithOriginal(
  croppedFile: File,
  _originalFile: File,
): Promise<CropUploadUrls> {
  const displayUrl = await uploadImage(ensureCroppedUploadFile(croppedFile));
  return { displayUrl, sourceUrl: displayUrl, originalStored: false };
}

/** @deprecated Use uploadCroppedWithOriginal */
export function normalizeUploadableFile(file: File): File {
  if (file.size === 0) throw new Error("Image file is empty.");
  const ext = fileExtension(file.name);
  if (ALLOWED_EXT.has(ext)) {
    return new File([file], file.name, { type: "image/jpeg", lastModified: file.lastModified || Date.now() });
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([file], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified || Date.now() });
}
