import type { Area } from "react-easy-crop";
import { buildApiUrl, resolveApiBase } from "../api/base";

/** The API declined to proxy this URL because it is not on our own media host. */
class NotOwnMediaError extends Error {
  constructor() {
    super("Not our media host");
    this.name = "NotOwnMediaError";
  }
}

/** Extract `/uploads/...` from a stored path or absolute URL. */
export function extractUploadPath(src: string): string | null {
  const trimmed = src.trim();
  if (trimmed.startsWith("/uploads/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/uploads/")) return parsed.pathname;
  } catch {
    return null;
  }
  return null;
}

async function fetchUploadPathViaApi(pathOrUrl: string): Promise<string> {
  const apiUrl = buildApiUrl(
    resolveApiBase(),
    `/api/images/file?path=${encodeURIComponent(pathOrUrl)}`,
  );

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      credentials: "include",
    });
  } catch {
    throw new Error(
      "Could not reach the API to load this image. Check your connection and that the backend allows this site in CORS.",
    );
  }

  if (res.status === 401) {
    throw new Error("You are not signed in. Log in as admin and try again.");
  }

  // The proxy only serves this site's own media; 400 means "not ours, fetch it yourself".
  if (res.status === 400) {
    throw new NotOwnMediaError();
  }

  if (!res.ok) {
    throw new Error(`Could not load image for cropping (${res.status}).`);
  }

  return URL.createObjectURL(await res.blob());
}

async function fetchRemoteAsBlobUrl(src: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(src, {
      mode: "cors",
      credentials: "omit",
    });
  } catch {
    throw new Error(
      "Could not load this image for cropping (network or CORS). Re-upload from device instead.",
    );
  }

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

  const uploadPath = extractUploadPath(src);
  if (uploadPath) {
    return fetchUploadPathViaApi(uploadPath);
  }

  // Product photos live on R2 now, so a direct browser fetch depends on that bucket's CORS
  // policy being right — and a misconfigured bucket silently breaks cropping for every stored
  // photo. The API proxies our own media instead, where CORS does not apply. It answers 400 for
  // any host that isn't ours, which is the signal to fall back to a direct fetch for a pasted
  // third-party URL. The backend owns that judgement so the media host isn't configured twice.
  const proxied = await tryFetchViaApi(src);
  if (proxied) return proxied;

  return fetchRemoteAsBlobUrl(src);
}

/** Proxies through the API, returning null when it declines the host as not ours. */
async function tryFetchViaApi(src: string): Promise<string | null> {
  try {
    return await fetchUploadPathViaApi(src);
  } catch (error) {
    if (error instanceof NotOwnMediaError) return null;
    throw error;
  }
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
  const safeSrc = await resolveImageSrcForCrop(imageSrc);
  return {
    src: safeSrc,
    revoke: safeSrc.startsWith("blob:") ? safeSrc : undefined,
  };
}

/**
 * The ground a fitted product sits on. Matches the image-container colour used across the
 * storefront (gallery, cards, admin tiles), so a photo that does not fill the frame reads as
 * deliberately floated on the brand surface rather than as a mistake.
 */
export const CROP_BACKGROUND = "#EDE9E2";

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: string = "image/jpeg",
  quality = 0.92,
  background: string = CROP_BACKGROUND,
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

    // Fill first. Zooming out makes the crop area larger than the image, and JPEG has no
    // alpha — without this those margins export as solid black.
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

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
