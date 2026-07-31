/** 
 * Lock a CSS px unit to the largest stable viewport height.
 * Updates on orientation change and when browser chrome visibility changes.
 */
export function initStableViewport(): void {
  if (typeof window === "undefined") return;

  let maxHeight = window.innerHeight;

  const apply = () => {
    const currentHeight = window.innerHeight;
    // Track the maximum height (when browser chrome is visible)
    if (currentHeight > maxHeight) {
      maxHeight = currentHeight;
    }
    // Always use the maximum height to prevent layout shifts
    document.documentElement.style.setProperty("--app-vh", `${maxHeight * 0.01}px`);
  };

  apply();
  
  // Handle orientation changes
  window.addEventListener("orientationchange", () => {
    maxHeight = window.innerHeight;
    window.setTimeout(apply, 150);
  });
  
  // Handle browser chrome show/hide (resize events)
  let resizeTimeout: number | null = null;
  window.addEventListener("resize", () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      apply();
      resizeTimeout = null;
    }, 100);
  }, { passive: true });
}
