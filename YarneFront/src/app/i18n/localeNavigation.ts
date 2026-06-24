/** Preserve scroll position across locale-only URL swaps (UA ↔ EN). */

let preservedScrollY: number | null = null;

export function preserveScrollForLocaleSwitch(): void {
  if (typeof window === "undefined") return;
  preservedScrollY = Math.max(0, Math.round(window.scrollY));
}

export function consumePreservedScroll(): number | null {
  const y = preservedScrollY;
  preservedScrollY = null;
  return y;
}
