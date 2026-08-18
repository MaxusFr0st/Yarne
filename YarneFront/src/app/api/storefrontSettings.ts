import { apiRequest } from "./client";

// ponytail: dedupes concurrent in-flight requests only, not resolved values — a remount still refetches.
// Add a value cache w/ save-invalidation if that measurably matters.
const inFlight = new Map<string, Promise<unknown>>();

export async function fetchStorefrontSetting<T>(key: string): Promise<T | null> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T | null>;

  const promise = (async () => {
    try {
      const res = await apiRequest<{ key: string; value: T }>(
        `/api/storefront-settings/${encodeURIComponent(key)}`
      );
      return res.value ?? null;
    } catch (e) {
      if (e instanceof Error && /404/.test(e.message)) return null;
      throw e;
    }
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

export async function saveStorefrontSetting<T>(key: string, value: T): Promise<T> {
  inFlight.delete(key);
  const res = await apiRequest<{ key: string; value: T }>(
    `/api/storefront-settings/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      body: JSON.stringify(value),
    }
  );
  return res.value;
}

/** Uploads the site-wide default share/link-preview photo (stored in R2). */
export async function uploadShareDefaultImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  const result = await apiRequest<{ url: string }>("/api/storefront-settings/share-default/image", {
    method: "POST",
    body: formData,
  });
  return result.url;
}
