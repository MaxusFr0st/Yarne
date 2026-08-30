/**
 * Generic IndexedDB-backed outbox — generalized from what expenseQueue.ts
 * already did for operating expenses, now that a second consumer
 * (orderOutbox.ts) needs the identical queue/sync pattern. Same behavior,
 * parameterized by database/store name instead of duplicated.
 */
export interface QueuedItem {
  id: string;
  queuedAt: string;
}

export interface Outbox<T extends QueuedItem> {
  queue: (item: Omit<T, "id" | "queuedAt">) => Promise<T>;
  getQueued: () => Promise<T[]>;
  remove: (id: string) => Promise<void>;
  sync: (submit: (item: T) => Promise<void>) => Promise<{ synced: number; remaining: number }>;
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function createOutbox<T extends QueuedItem>(
  databaseName: string,
  storeName: string,
  changeEventName: string,
): Outbox<T> {
  function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function queue(item: Omit<T, "id" | "queuedAt">): Promise<T> {
    const pending = {
      ...item,
      id: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
    } as T;
    const database = await openDatabase();
    try {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(pending);
      await waitForTransaction(transaction);
      window.dispatchEvent(new CustomEvent(changeEventName));
      return pending;
    } finally {
      database.close();
    }
  }

  async function getQueued(): Promise<T[]> {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
        request.onsuccess = () => {
          const rows = (request.result as T[]).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
          resolve(rows);
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }

  async function remove(id: string): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(id);
      await waitForTransaction(transaction);
      window.dispatchEvent(new CustomEvent(changeEventName));
    } finally {
      database.close();
    }
  }

  async function sync(submit: (item: T) => Promise<void>): Promise<{ synced: number; remaining: number }> {
    if (!navigator.onLine) {
      const pending = await getQueued();
      return { synced: 0, remaining: pending.length };
    }

    const pending = await getQueued();
    let synced = 0;
    for (const item of pending) {
      try {
        await submit(item);
        await remove(item.id);
        synced += 1;
      } catch {
        // Keep this and later entries queued; auth, rate, or network may need user action.
        break;
      }
    }
    return { synced, remaining: pending.length - synced };
  }

  return { queue, getQueued, remove, sync };
}
