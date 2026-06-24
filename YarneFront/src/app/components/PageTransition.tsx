import { type ReactNode } from "react";
import { useLocation } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";

const PAGE_EASE = [0.22, 1, 0.36, 1] as const;
const PAGE_DURATION = 0.55;

type PageTransitionProps = {
  children: ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const touch = useTouchMobileLayout();
  const routeKey = `${location.pathname}${location.search}`;
  const lite = touch && !reduceMotion;

  return (
    <AnimatePresence mode={touch ? "sync" : "wait"}>
      <motion.div
        key={routeKey}
        initial={reduceMotion ? false : lite ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : lite ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{
          duration: reduceMotion ? 0 : PAGE_DURATION,
          ease: PAGE_EASE,
        }}
        className="min-h-[calc(100svh-var(--main-header-h))]"
        style={lite ? { willChange: "opacity" } : undefined}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
