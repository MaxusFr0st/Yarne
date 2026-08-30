const DATABASE_NAME = "yarne-accounting";
const DATABASE_VERSION = 1;
const STORE_NAME = "pending-expenses";

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

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function queueExpense(
  expense: Omit<PendingExpense, "id" | "queuedAt">,
): Promise<PendingExpense> {
  const pending: PendingExpense = {
    ...expense,
    id: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  };
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(pending);
    await waitForTransaction(transaction);
    window.dispatchEvent(new CustomEvent("yarne-expense-queue-changed"));
    return pending;
  } finally {
    database.close();
  }
}

export async function getQueuedExpenses(): Promise<PendingExpense[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .getAll();
      request.onsuccess = () => {
        const rows = (request.result as PendingExpense[]).sort((a, b) =>
          a.queuedAt.localeCompare(b.queuedAt),
        );
        resolve(rows);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function removeQueuedExpense(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await waitForTransaction(transaction);
    window.dispatchEvent(new CustomEvent("yarne-expense-queue-changed"));
  } finally {
    database.close();
  }
}

export async function syncQueuedExpenses(
  submit: (expense: PendingExpense) => Promise<void>,
): Promise<{ synced: number; remaining: number }> {
  if (!navigator.onLine) {
    const pending = await getQueuedExpenses();
    return { synced: 0, remaining: pending.length };
  }

  const pending = await getQueuedExpenses();
  let synced = 0;
  for (const expense of pending) {
    try {
      await submit(expense);
      await removeQueuedExpense(expense.id);
      synced += 1;
    } catch {
      // Keep this and later entries queued; auth, rate, or network may need user action.
      break;
    }
  }
  return { synced, remaining: pending.length - synced };
}
