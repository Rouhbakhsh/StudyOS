import { AppState } from '../types';
import { INITIAL_STATE } from '../data/seedData';

const DB_NAME = 'StudyOS_DB';
const STORE_NAME = 'state_vault';
const DB_KEY = 'active_state';
const LEGACY_STORAGE_KEY = 'study_os_state';

// اتصال به دیتابیس بومی IndexedDB مرورگر/الکترون
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this device.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ذخیره آنی و خودکار تغییرات در IndexedDB (با ظرفیت نامحدود)
export async function saveAppState(state: AppState): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, DB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('IndexedDB Save Error:', err);
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }
}

// بارگذاری اطلاعات با قابلیت انتقال خودکار اطلاعات قبلی LocalStorage
export async function loadAppState(): Promise<AppState> {
  try {
    const db = await openDatabase();
    const storedState = await new Promise<AppState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(DB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (storedState) {
      return storedState;
    }

    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      try {
        const parsed = JSON.parse(legacyData);
        await saveAppState(parsed);
        return parsed;
      } catch (e) {
        console.warn('Failed to parse legacy localStorage data:', e);
      }
    }

    return INITIAL_STATE;
  } catch (err) {
    console.warn('IndexedDB load failed, trying fallback:', err);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      try {
        return JSON.parse(legacy);
      } catch {}
    }
    return INITIAL_STATE;
  }
}

// دانلود عمومی فایل متنی یا داده (مورد استفاده در ConsolidationDayView)
export function downloadFile(arg1: string, arg2?: string, mimeType: string = 'text/plain'): void {
  let filename = 'download.txt';
  let content = '';

  // پشتیبانی هوشمند از هر دو ترتیب پارامتر: (filename, content) یا (content, filename)
  if (arg1.includes('.') && !arg1.includes('\n') && arg2 !== undefined) {
    filename = arg1;
    content = arg2;
  } else if (arg2) {
    content = arg1;
    filename = arg2;
  } else {
    content = arg1;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// خروجی بک‌آپ آفلاین
export function exportBackupJSON(state: AppState): void {
  const dataStr = JSON.stringify(state, null, 2);
  downloadFile(
    `StudyOS-Backup-${new Date().toISOString().split('T')[0]}.json`,
    dataStr,
    'application/json'
  );
}

// بازیابی از فایل JSON
export function parseBackupFile(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          resolve(parsed as AppState);
        } else {
          reject(new Error('فرمت فایل پشتیبان معتبر نیست.'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsText(file);
  });
}