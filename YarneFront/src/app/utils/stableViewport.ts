/** Lock a CSS px unit to the viewport height at load (orientation changes only). */
export function initStableViewport(): void {
  if (typeof window === "undefined") return;

  const apply = () => {
    document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
  };

  apply();
  window.addEventListener("orientationchange", () => window.setTimeout(apply, 150));
}
