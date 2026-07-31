/** 
 * @deprecated No longer needed - use dvh/svh/lvh CSS units instead.
 * Legacy utility kept for backwards compatibility during transition.
 */
export function initStableViewport(): void {
  // Modern browsers use dvh/svh/lvh units (95% support as of 2026)
  // This function is kept for backwards compatibility but does nothing
  console.info("initStableViewport: Using native dvh units, JS tracking deprecated");
}
