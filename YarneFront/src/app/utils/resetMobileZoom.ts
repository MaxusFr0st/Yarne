/**
 * Forces iOS Safari back out to 1× after it has zoomed into a small-font input.
 *
 * Safari zooms in on focus for any input under 16px and then simply stays there — blurring
 * the field does not undo it, and there is no scripted zoom API. The one reliable lever is the
 * viewport meta: momentarily clamping `maximum-scale` makes the engine re-evaluate the scale
 * and snap back, after which the original content string is restored so the user keeps
 * pinch-zoom. Restoring it matters — leaving `maximum-scale=1` in place permanently would
 * block zoom for everyone, which is an accessibility failure, not a fix.
 *
 * No-ops on anything that is not a zooming mobile browser, since the clamp/restore is
 * invisible when the page was never scaled.
 */
export function resetMobileZoom(): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;

  const original = meta.getAttribute("content");
  if (!original) return;

  // Dropping focus first — a still-focused field can pull the zoom straight back.
  const active = document.activeElement;
  if (active instanceof HTMLElement && typeof active.blur === "function") active.blur();

  meta.setAttribute("content", `${original}, maximum-scale=1`);
  // Two frames: one for the clamp to take effect, one to hand pinch-zoom back.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => meta.setAttribute("content", original));
  });
}
