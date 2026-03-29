// In local development we default to local API; in production prefer explicit VITE_API_URL.
const explicitApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const isBrowser = typeof window !== "undefined";
const isLocalHost = isBrowser && ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = explicitApiBase && explicitApiBase.length > 0
  ? explicitApiBase.replace(/\/+$/, "")
  : isLocalHost
    ? "http://localhost:8080"
    : "";

function buildApiUrl(endpoint: string): string {
  return API_BASE ? `${API_BASE}${endpoint}` : endpoint;
}

function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl(endpoint), { ...options, headers });
  } catch {
    throw new Error(`Failed to reach API (${API_BASE || "relative /api route"}). Check VITE_API_URL/backend/CORS and retry.`);
  }

  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new CustomEvent("auth-expired"));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // ASP.NET validation errors: { errors: { Field: ["msg"] } } or { message: "..." }
    const msg = err?.message
      ?? (err?.errors && typeof err.errors === "object"
        ? Object.values(err.errors).flat().join(". ")
        : null)
      ?? `Request failed: ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
