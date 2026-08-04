/**
 * Lock a CSS px unit to the viewport height at load (orientation changes
 * only on touch, same as before). On a fine (mouse) pointer — desktop —
 * also re-measure on plain window resize, so un-maximizing/maximizing,
 * toggling the bookmarks bar, or dragging the window between monitors
 * doesn't leave every 100vh section sized to a stale height. Touch
 * devices are untouched: mobile browsers fire `resize` when their
 * address bar hides/shows during scroll, and reacting to that is
 * exactly what orientationchange-only avoids.
 */
export function initStableViewport(): void {
  if (typeof window === "undefined") return;

  const isTouch = window.matchMedia?.("(pointer: coarse)").matches ?? false;

  const apply = () => {
    document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
  };

  apply();
  window.addEventListener("orientationchange", () => window.setTimeout(apply, 150));
  if (!isTouch) {
    window.addEventListener("resize", apply);
  }
}
