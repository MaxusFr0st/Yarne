import { uploadImage } from "../api/images";
import { fileToDataUrl } from "./cropImage";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

function fileExtension(name: string): string {
  const match = name.match(/(\.[^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function mimeForExtension(ext: string): string {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

function hasAllowedExtension(name: string): boolean {
  return ALLOWED_EXT.has(fileExtension(name));
}

/** Backend only accepts specific extensions and MIME types — normalize before upload. */
export function toUploadableCroppedFile(blob: Blob, baseName: string): File {
  if (blob.size === 0) {
    throw new Error("Cropped image is empty. Adjust the crop area and try again.");
  }
  const safeBase = baseName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${safeBase}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

export function normalizeUploadableFile(file: File): File {
  if (file.size === 0) {
    throw new Error("Image file is empty.");
  }

  const ext = fileExtension(file.name);
  const rawType = (file.type || "").toLowerCase();
  const type =
    rawType === "image/jpg"
      ? "image/jpeg"
      : rawType === "application/octet-stream" && hasAllowedExtension(file.name)
        ? mimeForExtension(ext)
        : rawType;

  if (hasAllowedExtension(file.name) && ALLOWED_MIME.has(type)) {
    return new File([file], file.name, { type, lastModified: file.lastModified || Date.now() });
  }

  if (hasAllowedExtension(file.name)) {
    return new File([file], file.name, {
      type: mimeForExtension(ext),
      lastModified: file.lastModified || Date.now(),
    });
  }

  const fallbackExt =
    type === "image/png" ? ".png" : type === "image/gif" ? ".gif" : type === "image/webp" ? ".webp" : ".jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([file], `${base}${fallbackExt}`, {
    type: mimeForExtension(fallbackExt),
    lastModified: file.lastModified || Date.now(),
  });
}

async function reencodeAsJpeg(file: File): Promise<File> {
  const dataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image. Try JPG or PNG."));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const width = Math.max(1, image.naturalWidth);
  const height = Math.max(1, image.naturalHeight);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  ctx.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result || result.size === 0) {
          reject(new Error("Could not prepare image for upload. Try JPG or PNG."));
          return;
        }
        resolve(result);
      },
      "image/jpeg",
      0.92,
    );
  });

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return toUploadableCroppedFile(blob, base);
}

async function prepareOriginalForUpload(file: File): Promise<File> {
  if (!hasAllowedExtension(file.name)) {
    return reencodeAsJpeg(file);
  }

  const normalized = normalizeUploadableFile(file);
  const type = (normalized.type || "").toLowerCase();

  if (!ALLOWED_MIME.has(type)) {
    return reencodeAsJpeg(file);
  }

  return normalized;
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

const ORIGINAL_UPLOAD_TIMEOUT_MS = 12_000;

async function uploadOriginalWithTimeout(file: File): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ORIGINAL_UPLOAD_TIMEOUT_MS);
  try {
    const prepared = await prepareOriginalForUpload(file);
    return await uploadImage(prepared, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Upload cropped image first (required). Original is stored for re-crop when possible;
 * falls back to display URL if the original cannot be uploaded in time.
 */
export async function uploadCroppedWithOriginal(
  croppedFile: File,
  originalFile: File,
): Promise<CropUploadUrls> {
  const displayUrl = await uploadImage(ensureCroppedUploadFile(croppedFile));

  try {
    const sourceUrl = await uploadOriginalWithTimeout(originalFile);
    return { displayUrl, sourceUrl, originalStored: true };
  } catch {
    return { displayUrl, sourceUrl: displayUrl, originalStored: false };
  }
}
