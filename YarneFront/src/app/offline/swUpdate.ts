import i18n from "i18next";
import { toast } from "sonner";

/**
 * True only for an installed, home-screen-launched PWA — never a regular
 * browser tab. `display-mode: standalone` covers Android/desktop installs;
 * `navigator.standalone` is Safari's older iOS-specific equivalent.
 */
function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const isIosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return window.matchMedia?.("(display-mode: standalone)").matches || isIosStandalone;
}

/**
 * Watches the active service-worker registration for a new version and shows
 * a persistent toast with a "Refresh" action.
 *
 * PWA-only, deliberately. A regular browser tab gets a genuinely fresh load
 * on almost every visit, so a stale bundle rarely persists there and a
 * version-update prompt would just be confusing chrome for a normal shopper.
 * The problem this solves — an installed app frozen in the background
 * instead of closed, running old code indefinitely — is specific to
 * standalone/home-screen launches.
 */
export function watchForServiceWorkerUpdate(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (!isStandalonePwa()) return;

  const promptUpdate = (worker: ServiceWorker) => {
    toast(i18n.t("common.updateAvailable"), {
      duration: Infinity,
      action: {
        label: i18n.t("common.refresh"),
        onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
      },
    });
  };

  navigator.serviceWorker.getRegistration().then((registration) => {
    if (!registration) return;

    if (registration.waiting && navigator.serviceWorker.controller) {
      promptUpdate(registration.waiting);
    }

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        // A controller already existing means this is an update to a page
        // that's already running an older version — not the first install.
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          promptUpdate(installing);
        }
      });
    });
  });

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}
