/**
 * Exam Cache Utility
 * ==================
 * Shared IndexedDB helpers for caching exam data pushed via FCM.
 * Used by both useFCM.js (foreground caching) and MahasiswaUjian.jsx (offline exam loading).
 * 
 * No permissions needed — IndexedDB is a standard Web API.
 */

const DB_NAME = 'siakad_exam_cache';
const DB_VERSION = 1;
const STORE_NAME = 'exams';

/**
 * Open the exam cache IndexedDB database.
 */
export function openExamCacheDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache exam data (questions + metadata) to IndexedDB.
 * @param {Object} examPayload - The full exam object with questions array
 */
export async function cacheExamData(examPayload) {
  try {
    const db = await openExamCacheDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    examPayload._cachedAt = Date.now();
    store.put(examPayload);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.error('[examCache] Failed to cache exam:', e);
  }
}

/**
 * Get cached exam data from IndexedDB by exam ID.
 * @param {number} examId 
 * @returns {Promise<Object|null>} The cached exam object, or null if not found
 */
export async function getCachedExam(examId) {
  try {
    const db = await openExamCacheDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.get(examId);
      request.onsuccess = () => { db.close(); resolve(request.result || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (e) {
    console.error('[examCache] Failed to get cached exam:', e);
    return null;
  }
}

/**
 * Get all cached exams from IndexedDB.
 * @returns {Promise<Object[]>} Array of cached exam objects
 */
export async function getAllCachedExams() {
  try {
    const db = await openExamCacheDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => { db.close(); resolve(request.result || []); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (e) {
    console.error('[examCache] Failed to get all cached exams:', e);
    return [];
  }
}

/**
 * Remove a cached exam from IndexedDB after successful submission.
 * @param {number} examId 
 */
export async function removeCachedExam(examId) {
  try {
    const db = await openExamCacheDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(examId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.error('[examCache] Failed to remove cached exam:', e);
  }
}
