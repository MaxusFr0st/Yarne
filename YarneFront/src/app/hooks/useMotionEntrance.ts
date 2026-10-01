import { useReducedMotion } from "motion/react";
import { useNavigationType } from "react-router";
import { useTouchMobileLayout } from "./useTouchMobileLayout";

let navigated = false;

/** Called by Root on every page change, so a later back/forward can be told from the first page. */
export function noteNavigation(): void {
  navigated = true;
}

/**
 * Whether this page was reached with back/forward, not opened fresh. Such a page comes back as the
 * visitor left it: no entrance animations, no page fade. The first page of a visit is also a
 * "POP" to the router, hence the `navigated` flag.
 */
export function useReturningToPage(): boolean {
  return useNavigationType() === "POP" && navigated;
}

/**
 * Scroll/mount entrance.
 * Touch: soft slide + fade (not opacity-only — pure fade felt like text “popping”).
 * Reduced motion, or a page the visitor came back to: disabled.
 */
export function useMotionEntrance() {
  const reduced = useReducedMotion();
  const touch = useTouchMobileLayout();
  const returning = useReturningToPage();

  return {
    disabled: Boolean(reduced) || returning,
    touch,
    /** Prefer slide+fade on phone; pure opacity-only reads as janky pops. */
    opacityOnly: false,
  };
}
