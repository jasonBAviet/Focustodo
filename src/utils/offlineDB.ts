// Module quan ly IndexedDB cho luu tru ngoai tuyen (Offline Storage)
// Phien ban: 1.0 - Giai doan A (PWA)

const DB_NAME = 'focus-todo-offline';
const DB_VERSION = 1;

// Dinh nghia cac store (bang) trong IndexedDB
export const STORES = {
  TASKS: 'tasks',
  PROJECTS: 'projects',
  FOLDERS: 'folders',
  TAGS: 'tags',
  SYNC_QUEUE: 'sync_queue',
} as const;

let dbInstance: IDBDatabase | null = null;

// Mo ket noi IndexedDB - Chi khoi tao 1 lan
export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store chua danh sach task
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        taskStore.createIndex('project_id', 'project_id', { unique: false });
        taskStore.createIndex('folder_id', 'folder_id', { unique: false });
        taskStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Store chua danh sach project
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      }

      // Store chua danh sach folder
      if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
        db.createObjectStore(STORES.FOLDERS, { keyPath: 'id' });
      }

      // Store chua danh sach tag
      if (!db.objectStoreNames.contains(STORES.TAGS)) {
        db.createObjectStore(STORES.TAGS, { keyPath: 'id' });
      }

      // Store hang doi dong bo hoa (Sync Queue)
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
        syncStore.createIndex('entity', 'entity', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Ham get toan bo du lieu tu 1 store
export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

// Ham lay 1 ban ghi theo khoa chinh
export async function getById<T>(storeName: string, id: string | number): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

// Ham luu hoac cap nhat 1 ban ghi (upsert)
export async function upsert<T>(storeName: string, data: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Ham luu nhieu ban ghi cung luc (Bulk upsert)
export async function upsertMany<T>(storeName: string, dataList: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    dataList.forEach((item) => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Ham xoa 1 ban ghi theo id
export async function deleteById(storeName: string, id: string | number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Ham xoa toan bo du lieu trong 1 store
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
