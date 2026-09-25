/**
 * Sets --browser-bar-b (see theme.css) from real numbers on iPhone Safari.
 *
 * Measured on an iPhone 13 (iOS 26): screen 844, svh 699, lvh 739, safe-area-inset-bottom 0,
 * yet the page is rendered all the way to the screen bottom under the translucent bar (body text
 * shows through it 772px below the viewport top). No CSS unit reaches that bottom edge, so the
 * strip a full-height section must cover to keep the next one from showing through the glass is
 * screen height minus svh, and only JS knows the screen height. Other browsers keep the CSS
 * fallback.
 */
const IN_APP_UA =
  /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|Barcelona|Threads|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|LinkedInApp|\bLine\/|GSA\/|Twitter|Telegram|Viber|WhatsApp|MicroMessenger|KAKAOTALK/i;

/** In-app browsers have no Safari glass bar, and every real iOS browser keeps the "Safari/" token. */
function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return IN_APP_UA.test(ua) || !/Safari\//.test(ua);
}

export function installBrowserBarInset(): void {
  if (typeof window === "undefined") return;
  if (!/iPhone|iPod/.test(navigator.userAgent)) return;
  if (isInAppBrowser()) return; // its webview resizes with the app's bars and has no glass bar
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return; // home-screen app: no bar

  const apply = () => {
    const root = document.documentElement;
    if (window.innerWidth > window.innerHeight) {
      root.style.removeProperty("--browser-bar-b"); // landscape puts the chrome at the top
      return;
    }
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    const svh = probe.offsetHeight;
    probe.remove();
    const screenH = Math.max(window.screen.width, window.screen.height); // iOS reports portrait dims
    const bar = Math.min(240, Math.max(0, screenH - svh));
    root.style.setProperty("--browser-bar-b", `${bar}px`);
  };

  apply();
  window.addEventListener("orientationchange", () => window.setTimeout(apply, 300));
}
