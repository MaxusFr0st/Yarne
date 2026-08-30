import { createOutbox } from "./outbox";

export interface PendingExpense {
  id: string;
  queuedAt: string;
  categoryId: number;
  date: string;
  amountCents: number;
  vatAmountCents: number;
  currencyCode: string;
  exchangeRateToBase?: number;
  vendor?: string;
  description?: string;
  paymentMethod?: string;
  receiptBlob?: Blob;
  receiptFileName?: string;
}

const outbox = createOutbox<PendingExpense>("yarne-accounting", "pending-expenses", "yarne-expense-queue-changed");

export const queueExpense = outbox.queue;
export const getQueuedExpenses = outbox.getQueued;
export const removeQueuedExpense = outbox.remove;
export const syncQueuedExpenses = outbox.sync;
