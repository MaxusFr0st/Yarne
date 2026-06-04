import { buildApiUrl, resolveApiBase } from "./base";

const API_BASE = resolveApiBase();

function getAuthToken(): string | null {
  return sessionStorage.getItem("auth_token") ?? localStorage.getItem("auth_token");
}

function handleUnauthorized() {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_user");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  window.dispatchEvent(new CustomEvent("auth-expired"));
}

function assertTokenPresent(): void {
  const token = getAuthToken();
  if (!token) {
    throw new Error("You are not signed in. Log in as admin and try again.");
  }

  const userData = sessionStorage.getItem("auth_user") ?? localStorage.getItem("auth_user");
  if (!userData) return;

  try {
    const u = JSON.parse(userData) as { expiresAt?: string };
    if (u.expiresAt && new Date(u.expiresAt) <= new Date()) {
      handleUnauthorized();
      throw new Error("Your session expired. Log in again as admin, then upload.");
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("session expired")) throw e;
  }
}

export async function uploadImage(file: File): Promise<string> {
  assertTokenPresent();

  const formData = new FormData();
  formData.append("file", file);

  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildApiUrl(API_BASE, "/api/images/upload"), {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Upload failed: session expired or not authorized. Log in again as admin.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = err?.message ?? `Upload failed: ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : String(msg));
  }

  const data = await res.json();
  return data.url;
}
