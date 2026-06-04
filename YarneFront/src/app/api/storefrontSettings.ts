import { apiRequest } from "./client";

export async function fetchStorefrontSetting<T>(key: string): Promise<T | null> {
  try {
    const res = await apiRequest<{ key: string; value: T }>(
      `/api/storefront-settings/${encodeURIComponent(key)}`
    );
    return res.value ?? null;
  } catch (e) {
    if (e instanceof Error && /404/.test(e.message)) return null;
    throw e;
  }
}

export async function saveStorefrontSetting<T>(key: string, value: T): Promise<T> {
  const res = await apiRequest<{ key: string; value: T }>(
    `/api/storefront-settings/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      body: JSON.stringify(value),
    }
  );
  return res.value;
}
