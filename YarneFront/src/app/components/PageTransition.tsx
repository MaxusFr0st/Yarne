import { type ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

/** Instant route swaps — no enter/exit fade between pages. */
export function PageTransition({ children }: PageTransitionProps) {
  return <div className="min-h-[calc(100svh-var(--main-header-h))]">{children}</div>;
}
