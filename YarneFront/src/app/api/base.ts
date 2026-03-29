function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function normalizeConfiguredBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  // Railway variables should be unquoted, but handle accidental quotes safely.
  const unquoted = trimmed.replace(/^["']|["']$/g, "");
  if (!unquoted) return "";

  if (unquoted.startsWith("//")) {
    return `https:${unquoted}`;
  }

  if (/^https?:\/\//i.test(unquoted)) {
    return unquoted;
  }

  // If scheme is omitted, default to HTTPS for deployed environments.
  return `https://${unquoted}`;
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
  const configuredRaw = import.meta.env.VITE_API_URL as string | undefined;
  if (configuredRaw && configuredRaw.trim()) {
    return trimTrailingSlash(normalizeConfiguredBaseUrl(configuredRaw));
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
