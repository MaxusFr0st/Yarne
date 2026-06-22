import { useEffect, useState } from "react";

/** Touch phones + in-app browsers (Telegram, Instagram, etc.). */
export const TOUCH_MOBILE_MEDIA = "(max-width: 767px), (hover: none) and (pointer: coarse)";

/**
 * Returns true when running inside a constrained in-app browser (Instagram,
 * Facebook, Telegram, TikTok, Twitter/X, Line) where GPU compositing and JS
 * animation performance is significantly worse than a real browser.
 * Instagram on iOS registers pointer:fine so media-query detection alone misses it.
 */
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Instagram|FBAN|FBAV|FB_IAB|Telegram|TikTok|Twitter|Line\/|KAKAOTALK/i.test(
    navigator.userAgent
  );
}

export function useTouchMobileLayout(): boolean {
  const [isTouchMobile, setIsTouchMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia(TOUCH_MOBILE_MEDIA).matches || isInAppBrowser())
  );

  useEffect(() => {
    if (isInAppBrowser()) {
      setIsTouchMobile(true);
      return;
    }
    const mql = window.matchMedia(TOUCH_MOBILE_MEDIA);
    const onChange = () => setIsTouchMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTouchMobile;
}
