import { buildApiUrl, resolveApiBase } from "./base";
import { normalizeStoredMediaUrl } from "../utils/storefrontMedia";

const UPLOAD_TIMEOUT_MS = 60_000;

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

function parseUploadUrl(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("Upload succeeded but the server returned an invalid response.");
  }
  const record = data as Record<string, unknown>;
  const url = record.url ?? record.Url;
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Upload succeeded but the server returned no image URL.");
  }
  return url.trim();
}

function formatUploadError(err: unknown, res?: Response): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "Upload timed out. Check your connection and try again.";
  }
  if (err instanceof TypeError) {
    return `Could not reach the upload API (${resolveApiBase()}). Check backend status and CORS settings, then try again.`;
  }
  if (err instanceof Error) return err.message;
  if (res) return `Upload failed: ${res.status} ${res.statusText}`;
  return "Upload failed: unknown error";
}

type UploadImageOptions = {
  signal?: AbortSignal;
};

export async function uploadImage(file: File, options?: UploadImageOptions): Promise<string> {
  assertTokenPresent();

  if (file.size === 0) {
    throw new Error("Image file is empty. Choose a different photo and try again.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onExternalAbort);

  let res: Response;
  try {
    res = await fetch(buildApiUrl(resolveApiBase(), "/api/images/upload"), {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(formatUploadError(err));
  } finally {
    window.clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", onExternalAbort);
  }

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Upload failed: session expired or not authorized. Log in again as admin.");
  }

  if (!res.ok) {
    let message = `Upload failed: ${res.status}`;
    try {
      const err = await res.json();
      const raw = (err as { message?: string; Message?: string })?.message
        ?? (err as { message?: string; Message?: string })?.Message;
      if (typeof raw === "string" && raw.trim()) message = raw.trim();
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  try {
    const data = await res.json();
    return parseUploadUrl(data);
  } catch (err) {
    throw new Error(formatUploadError(err, res));
  }
}

export async function deleteUploadedImage(url: string): Promise<void> {
  const path = normalizeStoredMediaUrl(url);
  if (!path.startsWith("/uploads/")) return;

  assertTokenPresent();

  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const endpoint = `/api/images?path=${encodeURIComponent(path)}`;
  let res: Response;
  try {
    res = await fetch(buildApiUrl(resolveApiBase(), endpoint), {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(formatUploadError(err));
  }

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Delete failed: session expired or not authorized. Log in again as admin.");
  }

  if (res.status === 404) return;

  if (!res.ok) {
    let message = `Delete failed: ${res.status}`;
    try {
      const err = await res.json();
      const raw = (err as { message?: string; Message?: string })?.message
        ?? (err as { message?: string; Message?: string })?.Message;
      if (typeof raw === "string" && raw.trim()) message = raw.trim();
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
}
