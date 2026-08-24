/**
 * Best-effort attempt to return iOS Safari to 1× after it has zoomed into a small-font input.
 *
 * There is no scripted zoom API, and since iOS 10 Safari deliberately ignores `user-scalable`
 * and treats `maximum-scale` as advisory for user pinch-zoom — Apple removed those levers on
 * accessibility grounds. What Safari does still honour is `maximum-scale` when deciding
 * whether to auto-zoom a focused field, and it re-evaluates page scale on a layout pass it
 * considers significant. So the sequence is: drop focus, clamp, force a real reflow to trigger
 * that re-evaluation, then restore the original content string on the next frames.
 *
 * Restoring is not optional. Leaving the clamp in place would permanently block pinch-zoom,
 * trading a small annoyance for an accessibility failure.
 *
 * Honest ceiling: this works on some iOS versions and not others, and cannot be verified
 * outside a real device. The only *guaranteed* way to never be stuck zoomed is to stop the
 * zoom happening at all — inputs at >=16px — which is a deliberate trade-off made elsewhere.
 * ponytail: if this proves unreliable in the field, move to 16px inputs plus a CSS focus
 * transform that mimics the zoom under our own control.
 */
export function resetMobileZoom(): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const original = meta?.getAttribute("content");
  if (!meta || !original) return;

  // A still-focused field pulls the zoom straight back.
  const active = document.activeElement;
  if (active instanceof HTMLElement && typeof active.blur === "function") active.blur();

  meta.setAttribute("content", `${original}, maximum-scale=1`);

  // Force a synchronous layout pass. Reading offsetHeight after a style write is what makes
  // the engine flush rather than batch it, which is the whole point of the nudge.
  const root = document.documentElement;
  const previousHeight = root.style.height;
  root.style.height = "100.01%";
  void root.offsetHeight;
  root.style.height = previousHeight;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => meta.setAttribute("content", original));
  });
}
