function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function buildApiUrl(baseUrl: string, endpoint: string): string {
  const base = trimTrailingSlash(baseUrl);
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Avoid duplicated "/api/api" when base URL already ends with /api.
  if (base.toLowerCase().endsWith("/api") && path.toLowerCase().startsWith("/api/")) {
    return `${base}${path.slice(4)}`;
  }

  return `${base}${path}`;
}

export function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured && configured.trim()) {
    return trimTrailingSlash(configured.trim());
  }

  // Local development default.
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8080";
    }
    // Production fallback when env is missing: same-origin host.
    return trimTrailingSlash(window.location.origin);
  }

  return "http://localhost:8080";
}
