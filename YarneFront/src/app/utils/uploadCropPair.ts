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

/** Backend only accepts specific extensions and MIME types — normalize before upload. */
export function toUploadableCroppedFile(blob: Blob, baseName: string): File {
  const safeBase = baseName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${safeBase}.jpg`, { type: "image/jpeg" });
}

export function normalizeUploadableFile(file: File): File {
  const ext = fileExtension(file.name);
  const type = (file.type || "").toLowerCase().replace("image/jpg", "image/jpeg");

  if (ALLOWED_EXT.has(ext) && ALLOWED_MIME.has(type)) {
    return file;
  }

  if (ALLOWED_EXT.has(ext)) {
    return new File([file], file.name, { type: mimeForExtension(ext) });
  }

  const fallbackExt = type === "image/png" ? ".png" : type === "image/gif" ? ".gif" : type === "image/webp" ? ".webp" : ".jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([file], `${base}${fallbackExt}`, { type: mimeForExtension(fallbackExt) });
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
        if (!result) {
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
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

async function prepareOriginalForUpload(file: File): Promise<File> {
  const normalized = normalizeUploadableFile(file);
  const ext = fileExtension(normalized.name);
  const type = (normalized.type || "").toLowerCase();

  if (ALLOWED_EXT.has(ext) && ALLOWED_MIME.has(type)) {
    return normalized;
  }

  return reencodeAsJpeg(file);
}

export type CropUploadUrls = {
  displayUrl: string;
  sourceUrl: string;
  originalStored: boolean;
};

/**
 * Upload cropped image first (required). Original is stored for re-crop when possible;
 * falls back to display URL if the original cannot be uploaded (HEIC, bad MIME, etc.).
 */
export async function uploadCroppedWithOriginal(
  croppedFile: File,
  originalFile: File,
): Promise<CropUploadUrls> {
  const displayUrl = await uploadImage(normalizeUploadableFile(croppedFile));

  try {
    const sourceUrl = await uploadImage(await prepareOriginalForUpload(originalFile));
    return { displayUrl, sourceUrl, originalStored: true };
  } catch {
    return { displayUrl, sourceUrl: displayUrl, originalStored: false };
  }
}
