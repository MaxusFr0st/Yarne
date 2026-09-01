import { useEffect } from "react";

/**
 * Prevents the page behind a modal from scrolling while `locked` is true.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const prevBodyOverflow = body.style.overflow;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevBodyPaddingRight = body.style.paddingRight;

    // Deliberately no `overflow: hidden` on <html>. A non-visible overflow on the root
    // propagates to the viewport, and iPhone Safari then clips painting at the layout viewport,
    // which stops short of the screen bottom its translucent bar renders through: with the cart
    // open, everything below that line went white. The fixed body already prevents scrolling.
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.paddingRight = prevBodyPaddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
