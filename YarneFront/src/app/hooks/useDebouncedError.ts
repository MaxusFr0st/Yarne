import { useEffect, useState } from "react";

/**
 * Validates `value` against `validate`, but holds back the result while the user is still
 * typing — only reporting it `delayMs` after the last change, or immediately once
 * `reportNow()` is called (wire that to onBlur: leaving a field counts as "done", so it
 * shouldn't need to wait out the timer to hear what's wrong). Once reported, later edits are
 * validated live on every keystroke rather than re-arming the wait — a field the user has
 * already left once expects immediate feedback from then on.
 */
export function useDebouncedError<T>(
  value: T,
  validate: (value: T) => string | null | undefined,
  delayMs = 600
): { error: string | null | undefined; reportNow: () => void } {
  const [settled, setSettled] = useState(false);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    setSettled(false);
    const id = window.setTimeout(() => setSettled(true), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return {
    error: settled || forced ? validate(value) : null,
    reportNow: () => setForced(true),
  };
}
