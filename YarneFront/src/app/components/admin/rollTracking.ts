// Shared helper for the roll/discrete-item ("N rolls x length-each") material tracking
// feature. Used by the material stock view and purchase-order lot cards.

/** Rounds a length value to a clean display: whole units if the fractional part is
 * negligible, otherwise 1 decimal place. The underlying value used for FIFO/accounting
 * math is never touched — this is display-only rounding. */
export function formatLength(value: number): string {
  const rounded1dp = Math.round(value * 10) / 10;
  if (Math.abs(rounded1dp - Math.round(rounded1dp)) < 1e-6) {
    return String(Math.round(rounded1dp));
  }
  return rounded1dp.toFixed(1);
}

/**
 * Formats a roll/item breakdown, e.g. "3 full rolls + 40 m loose (400 m total)".
 * Returns null when the material/lot isn't item-tracked (nothing to show).
 */
export function formatRollBreakdown(
  wholeItems: number | null | undefined,
  looseRemainder: number | null | undefined,
  totalRemaining: number,
  unit: string,
): string | null {
  if (wholeItems == null || looseRemainder == null) return null;
  const rollWord = wholeItems === 1 ? "roll" : "rolls";
  const parts: string[] = [];
  if (wholeItems > 0) parts.push(`${wholeItems} full ${rollWord}`);
  if (looseRemainder > 0.0001) parts.push(`${formatLength(looseRemainder)} ${unit} loose`);
  // On-hand meters can exist without a roll breakdown (bulk lots). Don't claim empty.
  if (parts.length === 0) {
    return totalRemaining > 0.0001 ? null : `0 ${unit} (empty)`;
  }
  return `${parts.join(" + ")} (${formatLength(totalRemaining)} ${unit} total)`;
}
