import { useEffect, useState } from "react";

/** Touch phones + in-app browsers (Telegram, Instagram, etc.). */
export const TOUCH_MOBILE_MEDIA = "(max-width: 767px), (hover: none) and (pointer: coarse)";

/**
 * Returns true when running inside a constrained mobile browser where GPU
 * compositing and JS animation performance is significantly worse than Safari.
 * Includes in-app browsers (Instagram, Telegram) and iOS alternate browsers
 * (Chrome CriOS, Firefox FxiOS, Edge EdgiOS).
 */
function isConstrainedMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Instagram|FBAN|FBAV|FB_IAB|Telegram|TikTok|Twitter|Line\/|KAKAOTALK|CriOS|FxiOS|EdgiOS/i.test(
    navigator.userAgent
  );
}

export function useTouchMobileLayout(): boolean {
  const [isTouchMobile, setIsTouchMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia(TOUCH_MOBILE_MEDIA).matches || isConstrainedMobileBrowser())
  );

  useEffect(() => {
    if (isConstrainedMobileBrowser()) {
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
