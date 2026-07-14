import { buildApiUrl, resolveApiBase } from "./base";
import { ApiRequestError } from "./errors";

/** Clear legacy JWT storage from before httpOnly cookies. */
export function clearLegacyAuthStorage() {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_user");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

function handleUnauthorized() {
  clearLegacyAuthStorage();
  window.dispatchEvent(new CustomEvent("auth-expired"));
}

type ApiRequestOptions = RequestInit & {
  skipAuthExpire?: boolean;
  /** Internal: already retried once after a silent refresh. */
  _retriedAfterRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function postRefresh(): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl(resolveApiBase(), "/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(20_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** POST /api/auth/refresh once; same-tab callers share a promise; cross-tab uses Web Locks when available. */
export async function tryRefreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
      if (locks?.request) {
        try {
          return await locks.request("yarne-auth-refresh", postRefresh);
        } catch {
          return postRefresh();
        }
      }
      return postRefresh();
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuthExpire, _retriedAfterRefresh, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  const hasBody = fetchOptions.body !== undefined && fetchOptions.body !== null;
  if (hasBody && !(fetchOptions.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl(resolveApiBase(), endpoint), {
      ...fetchOptions,
      headers,
      credentials: "include",
      signal: fetchOptions.signal ?? AbortSignal.timeout(20_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(`API request timed out (${resolveApiBase()}). The backend may be down — check Railway deploy logs.`);
    }
    throw new Error(`Failed to reach API (${resolveApiBase()}). Check backend/CORS and retry.`);
  }

  if (res.status === 401 && !skipAuthExpire && !_retriedAfterRefresh) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiRequest<T>(endpoint, { ...options, _retriedAfterRefresh: true });
    }
    handleUnauthorized();
  } else if (res.status === 401 && !skipAuthExpire) {
    handleUnauthorized();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    const msg = err?.message
      ?? (err?.errors && typeof err.errors === "object"
        ? Object.values(err.errors as Record<string, string[]>).flat().join(". ")
        : null)
      ?? `Request failed: ${res.status}`;
    throw new ApiRequestError(typeof msg === "string" ? msg : JSON.stringify(msg), res.status, err);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`API returned non-JSON response from ${resolveApiBase()}. Set VITE_API_URL to your backend Railway URL.`);
  }
  return res.json();
}
