import { useEffect, useState } from "react";

/**
 * useState that survives a reload but not the tab closing.
 *
 * Checkout keeps the recipient's name, phone and email here rather than in localStorage:
 * losing a half-filled form to an accidental refresh is infuriating, but personal details
 * should not outlive the visit on a shared or public device. The cart itself is the opposite
 * trade-off and lives in localStorage.
 */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode or quota — the value still works for this render */
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/** Drops keys written by useSessionState — used once an order is placed. */
export function clearSessionState(...keys: string[]): void {
  if (typeof window === "undefined") return;
  try {
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    /* nothing to clean up if storage is unavailable */
  }
}
