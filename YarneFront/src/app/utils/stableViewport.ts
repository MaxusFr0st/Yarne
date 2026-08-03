/**
 * Lock a CSS px unit to the viewport height, re-measured on real size changes.
 * Touch browsers fire `resize` when their address bar hides/shows during
 * scroll — that only ever changes height, not width — so on a coarse
 * (touch) pointer, a height-only resize is treated as that jitter and
 * ignored. A fine (mouse) pointer has no such jitter, so every resize
 * (a plain window resize/maximize) is trusted there.
 */
export function initStableViewport(): void {
  if (typeof window === "undefined") return;

  const isTouch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  let lastWidth = window.innerWidth;

  const apply = () => {
    document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
  };

  apply();
  window.addEventListener("orientationchange", () => window.setTimeout(apply, 150));
  window.addEventListener("resize", () => {
    if (isTouch && window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    apply();
  });
}
