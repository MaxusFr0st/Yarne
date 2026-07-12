import { buildApiUrl, resolveApiBase } from "./base";
import { ApiRequestError } from "./errors";

function getAuthToken(): string | null {
  return sessionStorage.getItem("auth_token") ?? localStorage.getItem("auth_token");
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl(resolveApiBase(), endpoint), {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(20_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(`API request timed out (${resolveApiBase()}). The backend may be down — check Railway deploy logs.`);
    }
    throw new Error(`Failed to reach API (${resolveApiBase()}). Check backend/CORS and retry.`);
  }

  if (res.status === 401) {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new CustomEvent("auth-expired"));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    // ASP.NET validation errors: { errors: { Field: ["msg"] } } or { message: "..." }
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
