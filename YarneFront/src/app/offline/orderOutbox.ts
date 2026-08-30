import { createOrder, type CreateOrderItemRequest } from "../api/orders";
import { createOutbox } from "./outbox";

export interface PendingOrder {
  id: string;
  queuedAt: string;
  phoneNumber: string;
  email?: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientPhone: string;
  deliveryCityRef: string;
  deliveryCityName: string;
  deliveryWarehouseRef: string;
  deliveryWarehouseName: string;
  items: CreateOrderItemRequest[];
}

const outbox = createOutbox<PendingOrder>("yarne-orders", "pending-orders", "yarne-order-queue-changed");

export const queueOrder = outbox.queue;
export const getQueuedOrders = outbox.getQueued;
export const removeQueuedOrder = outbox.remove;

/**
 * Submits every queued order still pending. The outbox's own row id doubles as the order's
 * ClientOrderId — same value across every retry, since it's assigned once at queue() time and
 * never regenerated — so a sync that runs twice for the same order (flaky reconnect, two tabs)
 * hits CreateOrderCore's dedup check and gets the existing order back, never a duplicate.
 */
export async function syncQueuedOrders(): Promise<{ synced: number; remaining: number }> {
  return outbox.sync((pending) =>
    createOrder({
      clientOrderId: pending.id,
      phoneNumber: pending.phoneNumber,
      email: pending.email,
      recipientFirstName: pending.recipientFirstName,
      recipientLastName: pending.recipientLastName,
      recipientPhone: pending.recipientPhone,
      deliveryCityRef: pending.deliveryCityRef,
      deliveryCityName: pending.deliveryCityName,
      deliveryWarehouseRef: pending.deliveryWarehouseRef,
      deliveryWarehouseName: pending.deliveryWarehouseName,
      items: pending.items,
    }).then(() => undefined),
  );
}
