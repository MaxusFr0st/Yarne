import { useEffect, useState } from "react";

/** Touch phones + in-app browsers (Telegram, Instagram, etc.). */
export const TOUCH_MOBILE_MEDIA = "(max-width: 767px), (hover: none) and (pointer: coarse)";

export function useTouchMobileLayout(): boolean {
  const [isTouchMobile, setIsTouchMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(TOUCH_MOBILE_MEDIA).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(TOUCH_MOBILE_MEDIA);
    const onChange = () => setIsTouchMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTouchMobile;
}
