import { type ReactNode } from "react";
import { useLocation } from "react-router";

type PageTransitionProps = {
  children: ReactNode;
};

/**
 * Opacity-only route enter, run by CSS rather than by JS.
 *
 * The bug this fixes: the fade was gated on `reduced || touchMobile`, so the one route change
 * that matters on a phone — arriving at a product page — cut in with no transition at all,
 * while the desktop it was never needed on got the fade.
 *
 * CSS rather than motion for two reasons, neither of them "JS is slow": the animation is
 * compositor-driven from its first frame with no main-thread or JS involvement, which is the
 * cheap default on iOS; and its resting state is opacity 1, so an interrupted or cancelled
 * animation reverts to visible. motion's `initial={{ opacity: 0 }}` writes an inline opacity:0
 * that only comes off when the animation completes, so an interruption can strand the whole
 * route invisible. A missing fade is a cheap failure; a missing page is not.
 *
 * Keyframes and the reduced-motion opt-out live next to each other in theme.css.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  // Remounting on the route key is what restarts the CSS animation.
  return (
    <div
      key={`${location.pathname}${location.search}`}
      className="route-enter min-h-[calc(100vh-var(--main-header-h))]"
    >
      {children}
    </div>
  );
}
