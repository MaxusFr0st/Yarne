function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
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
    // Production fallback when env is missing: call same origin /api.
    return trimTrailingSlash(window.location.origin);
  }

  return "http://localhost:8080";
}
