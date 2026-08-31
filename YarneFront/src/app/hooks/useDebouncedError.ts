import { useEffect, useState } from "react";

/**
 * Validates `value` against `validate`, but holds back the result while the user is still
 * typing — only reporting it `delayMs` after the last change, or immediately once
 * `reportNow()` is called (wire that to onBlur: leaving a field counts as "done", so it
 * shouldn't need to wait out the timer to hear what's wrong). Once reported, later edits are
 * validated live on every keystroke rather than re-arming the wait — a field the user has
 * already left once expects immediate feedback from then on.
 *
 * Pass `fieldId` to get the ARIA wiring back ready-made: a visible red line under an input is
 * invisible to a screen reader unless the input actually points at it, so `fieldProps` and
 * `errorProps` keep that link from being forgotten at each call site.
 */
export function useDebouncedError<T>(
  value: T,
  validate: (value: T) => string | null | undefined,
  delayMs = 600,
  fieldId?: string
): {
  error: string | null | undefined;
  reportNow: () => void;
  fieldProps: { "aria-invalid"?: true; "aria-describedby"?: string };
  errorProps: { id?: string; role: "alert" };
} {
  const [settled, setSettled] = useState(false);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    setSettled(false);
    const id = window.setTimeout(() => setSettled(true), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  const error = settled || forced ? validate(value) : null;
  const errorId = fieldId ? `${fieldId}-error` : undefined;

  return {
    error,
    reportNow: () => setForced(true),
    fieldProps: {
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error && errorId ? errorId : undefined,
    },
    errorProps: { id: errorId, role: "alert" },
  };
}
