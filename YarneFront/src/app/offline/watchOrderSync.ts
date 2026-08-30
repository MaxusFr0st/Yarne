import i18n from "i18next";
import { toast } from "sonner";
import { syncQueuedOrders } from "./orderOutbox";

/**
 * Fires the moment connectivity returns, regardless of which page the
 * shopper is on — an order queued from checkout may sync long after they've
 * navigated away, so this can't be scoped to a single component's lifetime.
 */
export function watchOrderSync(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    void syncQueuedOrders().then(({ synced }) => {
      if (synced > 0) toast(i18n.t("checkout.orderSyncedNotice"));
    });
  });

  // Also try once at boot — a queued order can be sitting there from a
  // previous session that never got a chance to sync (tab closed offline).
  if (navigator.onLine) {
    void syncQueuedOrders().then(({ synced }) => {
      if (synced > 0) toast(i18n.t("checkout.orderSyncedNotice"));
    });
  }
}
