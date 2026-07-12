import type { Area } from "react-easy-crop";

function getAuthToken(): string | null {
  return sessionStorage.getItem("auth_token") ?? localStorage.getItem("auth_token");
}

async function fetchAsBlobUrl(src: string): Promise<string> {
  const isPublicUpload = /\/uploads\//i.test(src);
  const headers: HeadersInit = {};
  if (!isPublicUpload) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(src, {
    mode: "cors",
    credentials: "omit",
    ...(Object.keys(headers).length ? { headers } : {}),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 0 || res.type === "opaque"
        ? "This image host does not allow cropping. Re-upload from device instead."
        : `Could not load image for cropping (${res.status}).`,
    );
  }
  return URL.createObjectURL(await res.blob());
}

/** Loads remote images as blob URLs so canvas crop works across origins. */
export async function resolveImageSrcForCrop(src: string): Promise<string> {
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  return fetchAsBlobUrl(src);
}

export function revokeCropImageSrc(src: string | undefined) {
  if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Failed to load image for cropping")));
    // crossOrigin on data:/blob: URLs taints the canvas in Chromium — only set for remote http(s).
    if (/^https?:\/\//i.test(src)) {
      image.crossOrigin = "anonymous";
    }
    image.src = src;
  });
}

async function toCanvasSafeSrc(imageSrc: string): Promise<{ src: string; revoke?: string }> {
  if (imageSrc.startsWith("data:") || imageSrc.startsWith("blob:")) {
    return { src: imageSrc };
  }
  if (/^https?:\/\//i.test(imageSrc)) {
    const blobUrl = await fetchAsBlobUrl(imageSrc);
    return { src: blobUrl, revoke: blobUrl };
  }
  return { src: imageSrc };
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: string = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  const { src, revoke } = await toCanvasSafeSrc(imageSrc);
  try {
    const image = await loadImage(src);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported");

    const width = Math.max(1, Math.round(pixelCrop.width));
    const height = Math.max(1, Math.round(pixelCrop.height));
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      width,
      height,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to export cropped image. Try a different photo format."));
            return;
          }
          resolve(blob);
        },
        mimeType,
        quality,
      );
    });
  } finally {
    if (revoke) revokeCropImageSrc(revoke);
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
