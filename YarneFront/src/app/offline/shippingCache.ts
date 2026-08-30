import type { NovaPoshtaSelection } from "../components/NovaPoshtaPicker";

const DATABASE_NAME = "yarne-shipping";
const DATABASE_VERSION = 1;
const CITIES_STORE = "cities";
const WAREHOUSES_STORE = "warehouses";
const META_STORE = "meta";
const LAST_USED_BRANCH_KEY = "lastUsedBranch";

export interface CachedCity {
  ref: string;
  name: string;
}

export interface CachedWarehouse {
  ref: string;
  cityRef: string;
  description: string;
  shortAddress: string;
  number: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CITIES_STORE)) {
        database.createObjectStore(CITIES_STORE, { keyPath: "ref" });
      }
      if (!database.objectStoreNames.contains(WAREHOUSES_STORE)) {
        const store = database.createObjectStore(WAREHOUSES_STORE, { keyPath: "ref" });
        store.createIndex("cityRef", "cityRef", { unique: false });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
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

export async function saveCities(cities: CachedCity[]): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(CITIES_STORE, "readwrite");
    const store = transaction.objectStore(CITIES_STORE);
    for (const city of cities) store.put(city);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

export async function getCachedCities(): Promise<CachedCity[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(CITIES_STORE, "readonly").objectStore(CITIES_STORE).getAll();
      request.onsuccess = () => resolve(request.result as CachedCity[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function saveWarehouses(warehouses: CachedWarehouse[]): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(WAREHOUSES_STORE, "readwrite");
    const store = transaction.objectStore(WAREHOUSES_STORE);
    for (const warehouse of warehouses) store.put(warehouse);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

export async function getCachedWarehouses(cityRef: string): Promise<CachedWarehouse[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(WAREHOUSES_STORE, "readonly")
        .objectStore(WAREHOUSES_STORE)
        .index("cityRef")
        .getAll(cityRef);
      request.onsuccess = () => resolve(request.result as CachedWarehouse[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function saveLastUsedBranch(selection: NovaPoshtaSelection): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(META_STORE, "readwrite");
    transaction.objectStore(META_STORE).put({ key: LAST_USED_BRANCH_KEY, ...selection });
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

export async function getLastUsedBranch(): Promise<NovaPoshtaSelection | null> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(META_STORE, "readonly").objectStore(META_STORE).get(LAST_USED_BRANCH_KEY);
      request.onsuccess = () => {
        const row = request.result as (NovaPoshtaSelection & { key: string }) | undefined;
        if (!row) {
          resolve(null);
          return;
        }
        resolve({
          cityRef: row.cityRef,
          cityName: row.cityName,
          warehouseRef: row.warehouseRef,
          warehouseName: row.warehouseName,
        });
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}
