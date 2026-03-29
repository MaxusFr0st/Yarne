import { resolveApiBase } from "./base";

const API_BASE = resolveApiBase();

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
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new Error(`Failed to reach API (${API_BASE}). Check backend/CORS and retry.`);
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
  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`API returned non-JSON response from ${API_BASE}. Set VITE_API_URL to your backend Railway URL.`);
  }
  return res.json();
}
