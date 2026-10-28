import { SearchIndexItem, OxfordWordDetail } from '../types/oxford';
// ایمپورت مستقیم به حافظه بدون وابستگی به fetch و بدون خطای 404 در الکترون
import localSearchIndex from '../data/search_index.min.json';

let searchIndexCache: SearchIndexItem[] | null = null;
let fullDatabaseCache: Map<number, OxfordWordDetail> | null = null;
let loadDatabasePromise: Promise<Map<number, OxfordWordDetail> | null> | null = null;
let activeAudioInstance: HTMLAudioElement | null = null;
const OXFORD_CACHE_NAME = 'studyos-oxford-dict-v1';

/**
 * ۱. بارگذاری ایندکس سبک از حافظه داخلی
 */
export async function getSearchIndex(): Promise<SearchIndexItem[]> {
  if (searchIndexCache && searchIndexCache.length > 0) {
    return searchIndexCache;
  }

  try {
    const rawData = localSearchIndex as any[];
    searchIndexCache = rawData.map((item: any, index: number) => ({
      id: item.id !== undefined ? item.id : index + 1,
      w: item.w || item.word || '',
      p: item.p || item.pos || '',
      lvl: item.lvl || item.cefr || item.level || 'B2',
      tags: item.tags || item.academic_tags || [],
    }));

    return searchIndexCache;
  } catch (err) {
    console.error('Error parsing search index:', err);
    return [];
  }
}

/**
 * ۲. دریافت جزئیات کامل لغت
 */
export async function getWordDetailById(id: number): Promise<OxfordWordDetail | null> {
  return fetchWordDetailById(id);
}

export const getWordDetail = getWordDetailById;

async function ensureDatabaseLoaded(): Promise<Map<number, OxfordWordDetail> | null> {
  if (fullDatabaseCache) return fullDatabaseCache;
  if (loadDatabasePromise) return loadDatabasePromise;

  loadDatabasePromise = (async () => {
    let data: OxfordWordDetail[] | null = null;

    // ۱. بررسی کش اختصاصی مرورگر (CacheStorage) جهت مقاومت در برابر پاک شدن کش معمولی
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(OXFORD_CACHE_NAME);
        const cachedRes = await cache.match('/data/oxford5000_offline.min.json');
        if (cachedRes && cachedRes.ok) {
          data = await cachedRes.json();
        }
      } catch (err) {
        console.warn('CacheStorage read warning:', err);
      }
    }

    // ۲. در صورت نبودن در CacheStorage، واکشی از فایل لوکال و ذخیره در کش
    if (!data) {
      const candidatePaths = [
        './data/oxford5000_offline.min.json',
        '/data/oxford5000_offline.min.json',
        'data/oxford5000_offline.min.json',
      ];

      for (const p of candidatePaths) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            // ذخیره هم‌زمان نسخه در CacheStorage
            if (typeof window !== 'undefined' && 'caches' in window) {
              try {
                const cache = await caches.open(OXFORD_CACHE_NAME);
                await cache.put('/data/oxford5000_offline.min.json', res.clone());
              } catch {}
            }
            data = await res.json();
            break;
          }
        } catch {}
      }
    }

    if (!data || !Array.isArray(data)) {
      console.error('Failed to load oxford5000_offline.min.json');
      return null;
    }

    const map = new Map<number, OxfordWordDetail>();
    for (const item of data) {
      map.set(item.id, item);
    }

    fullDatabaseCache = map;
    return fullDatabaseCache;
  })().finally(() => {
    loadDatabasePromise = null;
  });

  return loadDatabasePromise;
}

async function fetchWordDetailById(id: number): Promise<OxfordWordDetail | null> {
  if (fullDatabaseCache && fullDatabaseCache.has(id)) {
    return fullDatabaseCache.get(id) || null;
  }

  const map = await ensureDatabaseLoaded();
  return map ? map.get(id) || null : null;
}

/**
 * ۳. پخش تلفظ آفلاین
 */
export function playOfflineAudio(audioPath?: string): void {
  if (!audioPath) return;

  try {
    if (activeAudioInstance) {
      activeAudioInstance.pause();
      activeAudioInstance.currentTime = 0;
    }

    const cleanPath = audioPath.replace(/^\/+/, '');
    activeAudioInstance = new Audio(cleanPath);
    activeAudioInstance.play().catch((err) => {
      console.warn('Audio playback error:', cleanPath, err);
    });
  } catch (err) {
    console.error('Audio engine playback error:', err);
  }
}