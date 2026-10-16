import { apiRequest } from "./client";
import { peekEarlyResponse } from "./earlyRequests";

// ponytail: dedupes concurrent in-flight requests only, not resolved values — a remount still refetches.
// Add a value cache w/ save-invalidation if that measurably matters.
const inFlight = new Map<string, Promise<unknown>>();

// Every server answer is remembered, so the next visit's first paint shows the real content
// instead of built-in defaults that get swapped a moment later.
const CACHE_PREFIX = "yarne.cache:";

/**
 * The saved texts scripts/server.mjs wrote into this page's HTML: the server's answers when the
 * page was sent, so the first frame shows the owner's current words. Kept up to date by every
 * later answer and save, so a page opened later in the same visit never goes back to them.
 */
let served: Record<string, unknown> | null | undefined;

function servedSettings(): Record<string, unknown> | null {
  if (served !== undefined) return served;
  served = null;
  try {
    const text = typeof document === "undefined" ? null : document.getElementById("yarne-settings")?.textContent;
    if (text) served = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // A page without them just starts from the last answer this browser saw.
  }
  return served;
}

function peekServed<T>(key: string): { value: T | null } | undefined {
  const all = servedSettings();
  return all && key in all ? { value: (all[key] ?? null) as T | null } : undefined;
}

/** The answer for `key` served with this page (or a newer one since), for code that keeps its own copy. */
export function peekServedStorefrontSetting<T>(key: string): { value: T | null } | undefined {
  return peekServed<T>(key);
}

function remember(key: string, value: unknown): void {
  const all = servedSettings();
  if (all) all[key] = value ?? null;
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value ?? null));
  } catch {
    // Storage full or blocked: the next visit just waits for the server again.
  }
}

/**
 * The current answer for `key` as far as this page knows: the one served with the page (or a
 * newer one since), else the last one this browser saw; undefined when there is neither.
 */
export function peekStorefrontSetting<T>(key: string): { value: T | null } | undefined {
  const current = peekServed<T>(key);
  if (current) return current;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    return raw == null ? undefined : { value: JSON.parse(raw) as T | null };
  } catch {
    return undefined;
  }
}

function settingEndpoint(key: string): string {
  return `/api/storefront-settings/${encodeURIComponent(key)}`;
}

/**
 * The server's current answer for `key` for this page load: asked for by src/early.ts before
 * the app started, or served with the page. Undefined while it is still on its way.
 */
export function peekCurrentStorefrontSetting<T>(key: string): { value: T | null } | undefined {
  const early = peekEarlyResponse<{ value?: T }>(settingEndpoint(key));
  return early ? { value: early.value.value ?? null } : peekServed<T>(key);
}

export async function fetchStorefrontSetting<T>(key: string): Promise<T | null> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T | null>;

  const promise = (async () => {
    try {
      const res = await apiRequest<{ key: string; value: T }>(
        settingEndpoint(key)
      );
      remember(key, res.value);
      return res.value ?? null;
    } catch (e) {
      if (e instanceof Error && /404/.test(e.message)) {
        remember(key, null);
        return null;
      }
      throw e;
    }
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

export async function saveStorefrontSetting<T>(key: string, value: T): Promise<T> {
  inFlight.delete(key);
  const res = await apiRequest<{ key: string; value: T }>(
    settingEndpoint(key),
    {
      method: "PUT",
      body: JSON.stringify(value),
    }
  );
  remember(key, res.value);
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
