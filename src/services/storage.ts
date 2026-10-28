import { AppState } from '../types';
import { INITIAL_STATE } from '../data/seedData';
import { getTodayDateString } from '../utils/date';
import { migratePlanDates } from './progress';

const DB_NAME = 'StudyOS_DB';
const STORE_NAME = 'state_vault';
const DB_KEY = 'active_state';
const LEGACY_STORAGE_KEY = 'study_os_state';
const LEGACY_NOTES_KEY = 'oxford_persian_notes';
const SAVE_DEBOUNCE_MS = 400;

// پل نسخه دسکتاپ (preload.cjs)؛ در مرورگر وجود ندارد و IndexedDB استفاده می‌شود
export interface DesktopBridge {
  loadState: () => Promise<string | null>;
  saveState: (json: string) => Promise<void>;
  saveStateSync: (json: string) => void;
  getDataInfo: () => Promise<{ dataFile: string; backupDir: string }>;
  openDataFolder: () => Promise<void>;
}

declare global {
  interface Window {
    studyosDesktop?: DesktopBridge;
  }
}

const desktop: DesktopBridge | undefined = typeof window !== 'undefined' ? window.studyosDesktop : undefined;
export const isDesktopApp = Boolean(desktop);

export function getDesktopBridge(): DesktopBridge | undefined {
  return desktop;
}

/* ---------------------------------------------------------
   اعتبارسنجی داده‌ها
   --------------------------------------------------------- */

const ARRAY_KEYS = ['flashcards', 'mistakes', 'sprints', 'lexicon', 'timerSessions'] as const;
const RECORD_KEYS = ['unitProgress', 'consolidationRecords', 'todayRitual', 'lexiconNotes'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// بررسی ساختار و تکمیل بخش‌های جاافتاده تا فایل ناقص یا قدیمی اپ را خراب نکند
export function normalizeAppState(raw: unknown): AppState {
  if (!isPlainObject(raw) || !isPlainObject(raw.settings)) {
    throw new Error('This is not a StudyOS backup file (no settings section found).');
  }

  const state: Record<string, unknown> = { ...raw };

  for (const key of ARRAY_KEYS) {
    const value = state[key];
    if (value === undefined) {
      state[key] = [];
    } else if (Array.isArray(value)) {
      state[key] = value.filter(isPlainObject);
    } else {
      throw new Error(`The "${key}" section of this backup file is damaged.`);
    }
  }

  for (const key of RECORD_KEYS) {
    const value = state[key];
    if (value === undefined) {
      state[key] = {};
    } else if (!isPlainObject(value)) {
      throw new Error(`The "${key}" section of this backup file is damaged.`);
    }
  }

  state.settings = migratePlanDates({ ...INITIAL_STATE.settings, ...raw.settings } as AppState['settings']);
  state.version = typeof raw.version === 'number' ? raw.version : INITIAL_STATE.version;

  return state as unknown as AppState;
}

// انتقال یادداشت‌های فارسی قدیمی Lexicon از localStorage به داخل داده‌های اصلی
function mergeLegacyNotes(state: AppState): AppState {
  try {
    const legacy = localStorage.getItem(LEGACY_NOTES_KEY);
    if (!legacy) return state;
    const notes = JSON.parse(legacy);
    if (!isPlainObject(notes)) return state;
    const merged: Record<string, string> = {};
    for (const [word, note] of Object.entries(notes)) {
      if (typeof note === 'string' && note.trim()) merged[word] = note;
    }
    // بعد از انتقال حذف می‌شود تا یادداشت پاک‌شده دوباره برنگردد (ذخیره خودکار بلافاصله بعد از بارگذاری انجام می‌شود)
    localStorage.removeItem(LEGACY_NOTES_KEY);
    return { ...state, lexiconNotes: { ...merged, ...(state.lexiconNotes || {}) } };
  } catch {
    return state;
  }
}

/* ---------------------------------------------------------
   IndexedDB (فقط نسخه مرورگری)
   --------------------------------------------------------- */

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
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
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

export async function enablePersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log('StudyOS Persistent Storage requested:', granted ? 'GRANTED' : 'DENIED');
        return granted;
      }
      return true;
    }
  } catch (err) {
    console.warn('Persistent storage request failed:', err);
  }
  return false;
}

async function saveToIndexedDB(state: AppState): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(state, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('IndexedDB Save Error:', err);
  }

  // ذخیره هم‌زمان در localStorage برای حداکثر پایداری در برابر پاک شدن کش مرورگر
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
    localStorage.setItem('studyos-app-state-v1', serialized);
  } catch {}
}

async function loadFromIndexedDB(): Promise<unknown | null> {
  try {
    const db = await openDatabase();
    const stored = await new Promise<unknown | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(DB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (stored) return stored;
  } catch (err) {
    console.warn('IndexedDB load failed, trying fallback:', err);
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    try {
      return JSON.parse(legacy);
    } catch (e) {
      console.warn('Failed to parse legacy localStorage data:', e);
    }
  }
  return null;
}

/* ---------------------------------------------------------
   ذخیره و بارگذاری
   --------------------------------------------------------- */

export async function saveAppState(state: AppState): Promise<void> {
  if (desktop) {
    try {
      await desktop.saveState(JSON.stringify(state));
    } catch (err) {
      console.error('Desktop Save Error:', err);
    }
    return;
  }
  await saveToIndexedDB(state);
}

export async function loadAppState(): Promise<AppState> {
  // فعال‌سازی ماندگاری دائمی حافظه مرورگر در هنگام بارگذاری
  enablePersistentStorage().catch(() => {});
  let raw: unknown = null;

  if (desktop) {
    try {
      const json = await desktop.loadState();
      raw = json ? JSON.parse(json) : null;
    } catch (err) {
      console.error('Desktop Load Error:', err);
    }
  } else {
    raw = await loadFromIndexedDB();
  }

  if (!raw) return mergeLegacyNotes(INITIAL_STATE);

  try {
    return mergeLegacyNotes(normalizeAppState(raw));
  } catch (err) {
    console.error('Stored state is invalid, starting from defaults:', err);
    return INITIAL_STATE;
  }
}

// ذخیره با تأخیر کوتاه تا هر تایپ یا تیک تایمر یک نوشتن جدا روی دیسک نباشد
let pendingState: AppState | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSave(state: AppState): void {
  pendingState = state;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const toSave = pendingState;
    pendingState = null;
    if (toSave) void saveAppState(toSave);
  }, SAVE_DEBOUNCE_MS);
}

// هنگام بستن پنجره، آخرین تغییرات بلافاصله نوشته می‌شوند
export function flushPendingSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const toSave = pendingState;
  pendingState = null;
  if (!toSave) return;

  if (desktop) {
    try {
      desktop.saveStateSync(JSON.stringify(toSave));
    } catch (err) {
      console.error('Desktop Flush Error:', err);
    }
  } else {
    void saveToIndexedDB(toSave);
  }
}

/* ---------------------------------------------------------
   فایل پشتیبان دستی
   --------------------------------------------------------- */

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
    `StudyOS-Backup-${getTodayDateString()}.json`,
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
        resolve(normalizeAppState(parsed));
      } catch (err) {
        if (err instanceof SyntaxError) {
          reject(new Error('This file is not valid JSON.'));
        } else {
          reject(err);
        }
      }
    };
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}
