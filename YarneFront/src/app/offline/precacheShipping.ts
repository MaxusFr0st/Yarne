import { fetchCities } from "../api/shipping";
import { saveCities } from "./shippingCache";

/**
 * Populates the offline city cache in the background, low priority, never
 * blocking first paint. Runs once per app boot; best-effort — a failure here
 * just means the offline picker falls back to whatever's already cached (or
 * nothing, if this is the very first visit).
 */
export function precacheCitiesInBackground(): void {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const run = () => {
    fetchCities()
      .then((cities) => saveCities(cities))
      .catch(() => undefined);
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 10_000 });
  } else {
    // Safari has no requestIdleCallback — a short delay keeps this off the critical path.
    window.setTimeout(run, 2_000);
  }
}
