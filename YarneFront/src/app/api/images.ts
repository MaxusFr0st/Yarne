const explicitApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const isBrowser = typeof window !== "undefined";
const isLocalHost = isBrowser && ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = explicitApiBase && explicitApiBase.length > 0
  ? explicitApiBase.replace(/\/+$/, "")
  : isLocalHost
    ? "http://localhost:8080"
    : "";

function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  // Do NOT set Content-Type - browser sets multipart/form-data with boundary

  const res = await fetch(`${API_BASE}/api/images/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Upload failed: ${res.status}`);
  }

  const data = await res.json();
  return data.url;
}
