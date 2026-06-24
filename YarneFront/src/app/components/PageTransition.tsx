import { type ReactNode } from "react";
import { useLocation } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const PAGE_EASE = [0.22, 1, 0.36, 1] as const;
const PAGE_DURATION = 0.55;

type PageTransitionProps = {
  children: ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const routeKey = `${location.pathname}${location.search}`;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
        transition={{
          duration: reduceMotion ? 0 : PAGE_DURATION,
          ease: PAGE_EASE,
        }}
        className="min-h-[calc(100svh-var(--main-header-h))]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
