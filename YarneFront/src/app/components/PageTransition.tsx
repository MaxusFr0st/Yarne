import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { useLocation } from "react-router";

type PageTransitionProps = {
  children: ReactNode;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Opacity-only route enter — 220ms, no y-shift (avoids scroll-up feel on mobile). */
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
      transition={{ duration: reduced ? 0 : 0.22, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
