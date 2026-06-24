import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { useLocation } from "react-router";

type PageTransitionProps = {
  children: ReactNode;
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Opacity-only route enter — soft ease-out, no y-shift. */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const reduced = useReducedMotion();
  const routeKey = `${location.pathname}${location.search}`;

  return (
    <motion.div
      key={routeKey}
      className="min-h-[calc(100svh-var(--main-header-h))]"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.32, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
