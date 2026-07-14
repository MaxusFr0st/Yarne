import { useReducedMotion } from "motion/react";
import { useTouchMobileLayout } from "./useTouchMobileLayout";

/**
 * Scroll/mount entrance.
 * Touch: soft slide + fade (not opacity-only — pure fade felt like text “popping”).
 * Reduced motion: disabled.
 */
export function useMotionEntrance() {
  const reduced = useReducedMotion();
  const touch = useTouchMobileLayout();

  return {
    disabled: Boolean(reduced),
    touch,
    /** Prefer slide+fade on phone; pure opacity-only reads as janky pops. */
    opacityOnly: false,
  };
}
