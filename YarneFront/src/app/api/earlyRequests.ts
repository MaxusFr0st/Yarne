import { buildApiUrl, resolveApiBase } from "./base";

/**
 * A server answer src/early.ts asked for before the app's code had arrived. `value` is set once
 * the answer is in; `promise` rejects on any failure, and the app then simply asks again itself.
 */
export type EarlyEntry = {
  promise: Promise<unknown>;
  value?: unknown;
};

/** Keyed by full request URL, so a URL early.ts builds differently just never matches. */
export type EarlyRequests = Record<string, EarlyEntry>;

declare global {
  interface Window {
    __YARNE_EARLY__?: EarlyRequests;
  }
}

function urlFor(endpoint: string): string {
  return buildApiUrl(resolveApiBase(), endpoint);
}

/**
 * The early answer for a GET of `endpoint`, handed over once: the first caller gets it and later
 * calls go to the network as usual, so a refetch never replays an old answer.
 */
export function takeEarlyResponse<T>(endpoint: string): Promise<T> | undefined {
  const early = typeof window === "undefined" ? undefined : window.__YARNE_EARLY__;
  const url = urlFor(endpoint);
  const entry = early?.[url];
  if (!entry) return undefined;
  delete early![url];
  return entry.promise as Promise<T>;
}

/** The early answer for `endpoint` if it has already arrived; for a page's first render. */
export function peekEarlyResponse<T>(endpoint: string): { value: T } | undefined {
  const entry = typeof window === "undefined" ? undefined : window.__YARNE_EARLY__?.[urlFor(endpoint)];
  return entry && "value" in entry ? { value: entry.value as T } : undefined;
}
