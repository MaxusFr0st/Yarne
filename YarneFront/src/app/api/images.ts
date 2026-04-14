import { buildApiUrl, resolveApiBase } from "./base";

const API_BASE = resolveApiBase();

function getAuthToken(): string | null {
  return sessionStorage.getItem("auth_token") ?? localStorage.getItem("auth_token");
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

  const res = await fetch(buildApiUrl(API_BASE, "/api/images/upload"), {
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
