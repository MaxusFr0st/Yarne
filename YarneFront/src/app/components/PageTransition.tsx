import { useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useReturningToPage } from "../hooks/useMotionEntrance";
import { stripLocaleFromPath } from "../i18n/useLocale";
import { isCareGuidePath } from "../utils/scrollRestoration";

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
  // Back/forward returns to a page as it was left: a short settle, not a fade in from nothing.
  const returning = useReturningToPage();

  // A care guide's query only opens a topic or picks a piece on the same page.
  const key = isCareGuidePath(stripLocaleFromPath(location.pathname))
    ? location.pathname
    : `${location.pathname}${location.search}`;
  // How the page was entered, kept while it stays: switching the class would replay the fade.
  const entered = useRef({ key, returning });
  if (entered.current.key !== key) entered.current = { key, returning };

  // Remounting on the route key is what restarts the CSS animation.
  return (
    <div
      key={key}
      className={`${entered.current.returning ? "route-return" : "route-enter"} min-h-[calc(var(--app-svh)-var(--main-header-h))]`}
    >
      {children}
    </div>
  );
}
