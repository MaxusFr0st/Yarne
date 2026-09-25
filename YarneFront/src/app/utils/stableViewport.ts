/**
 * The screen height, measured once.
 *
 * In-app browsers (Instagram, TikTok, Facebook...) resize the whole page as their bars slide in
 * and out, and every CSS height unit (vh, svh, dvh, lvh) follows, so anything sized from them
 * re-lays out on every scroll. On phones nothing in the page flow is sized from the height (width,
 * aspect-ratio and content instead); the few things that must be one screen tall (the pinned Why
 * frame, the pinned hero's offset) read --app-svh instead.
 *
 * On touch devices --app-svh is a plain pixel value taken at load and again only when the width
 * changes (rotation). A height-only change (bars sliding, keyboard) is ignored. It is the smaller
 * of innerHeight and 100svh: in a real browser that is svh, in an in-app one the two are equal.
 * Desktop keeps the live 100svh from theme.css, where a height change is a real window resize.
 */
let height = 0;
let width = 0;
const listeners = new Set<() => void>();

/** Viewport height for layout maths in JS: frozen on touch devices, live on desktop. */
export function getStableViewportHeight(): number {
  return height || window.innerHeight;
}

/** Called when the frozen height is re-taken (rotation). */
export function onStableViewportChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function measure(): void {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);
  const svh = probe.offsetHeight;
  probe.remove();

  width = window.innerWidth;
  height = Math.min(window.innerHeight, svh || window.innerHeight);
  document.documentElement.style.setProperty("--app-svh", `${height}px`);
  listeners.forEach((cb) => cb());
}

export function installStableViewport(): void {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return; // desktop: live units
  measure();
  let timer = 0;
  window.addEventListener(
    "resize",
    () => {
      if (Math.abs(window.innerWidth - width) <= 1) return;
      // Rotation reports width and height at different moments; wait for both to settle.
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 300);
    },
    { passive: true }
  );
}
