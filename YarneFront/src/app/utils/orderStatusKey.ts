/**
 * Normalizes whatever casing/alias the API returns for an order status into the key used by
 * the `account.status.*` / `account.deliveryProgress.*` translation blocks.
 *
 * Note this is the *display* normalizer and returns lowercase i18n keys. AdminPage has a
 * separate one that returns the PascalCase `OrderStatus` the API expects on write — the two
 * look alike but are not interchangeable.
 */
export type OrderStatusKey =
  | "pending"
  | "accepted"
  | "inproduction"
  | "made"
  | "shipped"
  | "received"
  | "canceled";

export function orderStatusKey(value: string): OrderStatusKey {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  if (normalized === "accepted" || normalized === "confirmed" || normalized === "processing") return "accepted";
  if (normalized === "inproduction") return "inproduction";
  if (normalized === "made") return "made";
  if (normalized === "shipped") return "shipped";
  if (normalized === "received" || normalized === "delivered") return "received";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  return "pending";
}
