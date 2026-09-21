import { SearchIndexItem, OxfordWordDetail } from '../types/oxford';
// ایمپورت مستقیم به حافظه بدون وابستگی به fetch و بدون خطای 404 در الکترون
import localSearchIndex from '../data/search_index.min.json';

let searchIndexCache: SearchIndexItem[] | null = null;
let fullDatabaseCache: Map<number, OxfordWordDetail> | null = null;
let activeAudioInstance: HTMLAudioElement | null = null;

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
  if (fullDatabaseCache && fullDatabaseCache.has(id)) {
    return fullDatabaseCache.get(id) || null;
  }

  const candidatePaths = [
    './data/oxford5000_offline.min.json',
    '/data/oxford5000_offline.min.json',
    'data/oxford5000_offline.min.json',
  ];

  let data: OxfordWordDetail[] | null = null;

  for (const p of candidatePaths) {
    try {
      const res = await fetch(p);
      if (res.ok) {
        data = await res.json();
        break;
      }
    } catch {}
  }

  if (!data || !Array.isArray(data)) {
    console.error('Failed to load oxford5000_offline.min.json');
    return null;
  }

  fullDatabaseCache = new Map<number, OxfordWordDetail>();
  for (const item of data) {
    fullDatabaseCache.set(item.id, item);
  }

  return fullDatabaseCache.get(id) || null;
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