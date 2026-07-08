/* db.js — tiny promise wrapper around IndexedDB for the 75-day tracker */
const DB_NAME = 'seventyfive-db';
const DB_VERSION = 1;
let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('days')) {
        db.createObjectStore('days', { keyPath: 'day' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'day' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

const DB = {
  async getMeta(key) {
    const store = await tx('meta');
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  },
  async setMeta(key, value) {
    const store = await tx('meta', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },
  async getDay(day) {
    const store = await tx('days');
    return new Promise((resolve, reject) => {
      const req = store.get(day);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async putDay(record) {
    const store = await tx('days', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },
  async getAllDays() {
    const store = await tx('days');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },
  async putPhoto(day, blob) {
    const store = await tx('photos', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put({ day, blob, takenAt: new Date().toISOString() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },
  async getPhoto(day) {
    const store = await tx('photos');
    return new Promise((resolve, reject) => {
      const req = store.get(day);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async getAllPhotos() {
    const store = await tx('photos');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.day - b.day));
      req.onerror = () => reject(req.error);
    });
  },
  async clearAll() {
    const db = await openDB();
    const storeNames = ['meta', 'days', 'photos'];
    return Promise.all(storeNames.map((name) => new Promise((resolve, reject) => {
      const req = db.transaction(name, 'readwrite').objectStore(name).clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    })));
  },
};
