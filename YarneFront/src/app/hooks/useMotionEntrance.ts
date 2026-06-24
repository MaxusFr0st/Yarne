import { useReducedMotion } from "motion/react";
import { useTouchMobileLayout } from "./useTouchMobileLayout";

/** Scroll/mount entrance — opacity-only on touch, disabled when reduced-motion. */
export function useMotionEntrance() {
  const reduced = useReducedMotion();
  const touch = useTouchMobileLayout();

  return {
    disabled: Boolean(reduced),
    touch,
    opacityOnly: touch && !reduced,
  };
}
