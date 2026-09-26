import { buildApiUrl, resolveApiBase } from "./base";

/**
 * A server answer src/early.ts asked for before the app's code had arrived. `value` is set once
 * the answer is in; `promise` rejects on any failure, and the app then simply asks again itself.
 */
export type EarlyEntry = {
  promise: Promise<unknown>;
  value?: unknown;
  /** Date.now() when early.ts asked. */
  askedAt: number;
};

/**
 * Early answers are for the page's first requests, made within a second or two of opening it.
 * One nothing asked for in time (the visitor left, say) must not answer a much later request
 * with old data, so after this it is ignored and that request goes to the network.
 */
const EARLY_ANSWER_MAX_AGE_MS = 10_000;

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

function entryFor(url: string): EarlyEntry | undefined {
  const early = typeof window === "undefined" ? undefined : window.__YARNE_EARLY__;
  const entry = early?.[url];
  if (!entry) return undefined;
  if (Date.now() - entry.askedAt > EARLY_ANSWER_MAX_AGE_MS) {
    delete early![url];
    return undefined;
  }
  return entry;
}

/**
 * The early answer for a GET of `endpoint`, handed over once: the first caller gets it and later
 * calls go to the network as usual, so a refetch never replays an old answer.
 */
export function takeEarlyResponse<T>(endpoint: string): Promise<T> | undefined {
  const url = urlFor(endpoint);
  const entry = entryFor(url);
  if (!entry) return undefined;
  delete window.__YARNE_EARLY__![url];
  return entry.promise as Promise<T>;
}

/** The early answer for `endpoint` if it has already arrived; for a page's first render. */
export function peekEarlyResponse<T>(endpoint: string): { value: T } | undefined {
  const entry = entryFor(urlFor(endpoint));
  return entry && "value" in entry ? { value: entry.value as T } : undefined;
}
