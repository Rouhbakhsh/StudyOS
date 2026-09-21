export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

// تایپ مربوط به آیتم‌های فایل سبک search_index.min.json
export interface SearchIndexItem {
  id: number;
  w: string;       // word (عنوان کلمه)
  p: string;       // part of speech (نقش دستوری)
  lvl: string;     // CEFR level (سطح استاندارد)
  tags: string[];  // OPAL_S, OPAL_W
}

// تایپ مربوط به تعاریف و معانی مختلف کلمه
export interface SenseItem {
  cefr?: string;
  grammar?: string;
  patterns?: string[];
  definition: string;
  examples?: string[];
  extra_examples?: string[];
  collocations?: string[];
}

// تایپ جامع و کامل لغت از فایل oxford5000_offline.min.json
export interface OxfordWordDetail {
  id: number;
  word: string;
  pos: string;
  cefr: string;
  academic_tags: string[];
  phonetics: {
    uk?: string;
    us?: string;
  };
  audio: {
    uk?: string;
    us?: string;
  };
  verb_forms?: string[];
  senses: SenseItem[];
}