import { RefundCase, ChatMessage, RefundTemplate } from "../types";

const DB_NAME = 'RefundAgentDB';
const DB_VERSION = 2;
const STORE_CASES = 'cases';
const STORE_CHAT = 'chat_history';
const STORE_TEMPLATES = 'templates';

/**
 * Open the IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject("Database error: " + (event.target as IDBOpenDBRequest).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for Refund Cases (id is key)
      if (!db.objectStoreNames.contains(STORE_CASES)) {
        db.createObjectStore(STORE_CASES, { keyPath: 'id' });
      }

      // Store for Chat History (auto-incrementing)
      if (!db.objectStoreNames.contains(STORE_CHAT)) {
        db.createObjectStore(STORE_CHAT, { keyPath: 'id' });
      }

      // Store for Templates
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
      }
    };
  });
};

// --- Case Management ---

export const saveCaseToDB = async (caseData: RefundCase): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CASES], 'readwrite');
    const store = transaction.objectStore(STORE_CASES);
    const request = store.put(caseData);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllCasesFromDB = async (): Promise<RefundCase[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CASES], 'readonly');
    const store = transaction.objectStore(STORE_CASES);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as RefundCase[];
      results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteCaseFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CASES], 'readwrite');
    const store = transaction.objectStore(STORE_CASES);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Template Management ---

export const saveTemplateToDB = async (template: RefundTemplate): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TEMPLATES], 'readwrite');
    const store = transaction.objectStore(STORE_TEMPLATES);
    const request = store.put(template);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllTemplatesFromDB = async (): Promise<RefundTemplate[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
      resolve([]);
      return;
    }
    const transaction = db.transaction([STORE_TEMPLATES], 'readonly');
    const store = transaction.objectStore(STORE_TEMPLATES);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as RefundTemplate[];
      results.sort((a, b) => b.createdAt - a.createdAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteTemplateFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TEMPLATES], 'readwrite');
    const store = transaction.objectStore(STORE_TEMPLATES);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Chat Memory Management ---

export const saveChatMessageToDB = async (message: ChatMessage): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CHAT], 'readwrite');
    const store = transaction.objectStore(STORE_CHAT);
    const request = store.put(message);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getChatHistoryFromDB = async (): Promise<ChatMessage[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CHAT], 'readonly');
    const store = transaction.objectStore(STORE_CHAT);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as ChatMessage[]);
    request.onerror = () => reject(request.error);
  });
};

export const clearChatHistoryDB = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAT], 'readwrite');
      const store = transaction.objectStore(STORE_CHAT);
      const request = store.clear();
  
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };