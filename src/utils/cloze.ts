import { OxfordWordDetail } from '../types/oxford';
import { Flashcard } from '../types';
import { getTodayDateString } from './date';

export const IRREGULAR_VERBS: Record<string, string[]> = {
  make: ['make', 'makes', 'made', 'making'],
  take: ['take', 'takes', 'took', 'taken', 'taking'],
  keep: ['keep', 'keeps', 'kept', 'keeping'],
  give: ['give', 'gives', 'gave', 'given', 'giving'],
  get: ['get', 'gets', 'got', 'gotten', 'getting'],
  have: ['have', 'has', 'had', 'having'],
  do: ['do', 'does', 'did', 'done', 'doing'],
  go: ['go', 'goes', 'went', 'gone', 'going'],
  come: ['come', 'comes', 'came', 'coming'],
  see: ['see', 'sees', 'saw', 'seen', 'seeing'],
  say: ['say', 'says', 'said', 'saying'],
  tell: ['tell', 'tells', 'told', 'telling'],
  find: ['find', 'finds', 'found', 'finding'],
  leave: ['leave', 'leaves', 'left', 'leaving'],
  fall: ['fall', 'falls', 'fell', 'fallen', 'falling'],
  hold: ['hold', 'holds', 'held', 'holding'],
  bring: ['bring', 'brings', 'brought', 'bringing'],
  bear: ['bear', 'bears', 'bore', 'borne', 'bearing'],
  run: ['run', 'runs', 'ran', 'running'],
  set: ['set', 'sets', 'setting'],
  put: ['put', 'puts', 'putting'],
  stand: ['stand', 'stands', 'stood', 'standing'],
  lose: ['lose', 'loses', 'lost', 'losing'],
  pay: ['pay', 'pays', 'paid', 'paying'],
  meet: ['meet', 'meets', 'met', 'meeting'],
  lead: ['lead', 'leads', 'led', 'leading'],
  speak: ['speak', 'speaks', 'spoke', 'spoken', 'speaking'],
  break: ['break', 'breaks', 'broke', 'broken', 'breaking'],
  catch: ['catch', 'catches', 'caught', 'catching'],
  draw: ['draw', 'draws', 'drew', 'drawn', 'drawing'],
  feel: ['feel', 'feels', 'felt', 'feeling'],
  grow: ['grow', 'grows', 'grew', 'grown', 'growing'],
  hear: ['hear', 'hears', 'heard', 'hearing'],
  know: ['know', 'knows', 'knew', 'known', 'knowing'],
  let: ['let', 'lets', 'letting'],
  mean: ['mean', 'means', 'meant', 'meaning'],
  read: ['read', 'reads', 'reading'],
  rise: ['rise', 'rises', 'rose', 'risen', 'rising'],
  send: ['send', 'sends', 'sent', 'sending'],
  show: ['show', 'shows', 'showed', 'shown', 'showing'],
  spend: ['spend', 'spends', 'spent', 'spending'],
  throw: ['throw', 'throws', 'threw', 'thrown', 'throwing'],
  wear: ['wear', 'wears', 'wore', 'worn', 'wearing'],
  win: ['win', 'wins', 'won', 'winning'],
  write: ['write', 'writes', 'wrote', 'written', 'writing'],
  be: ['be', 'is', 'am', 'are', 'was', 'were', 'been', 'being'],
};

/**
 * Extracts morphological variants of a word (plurals, past, participle, -ing, verb_forms)
 */
export function getWordVariants(word: string, verbForms?: string[]): string[] {
  const variants = new Set<string>();
  const base = word.trim().toLowerCase();
  if (!base) return [];

  variants.add(base);

  // Parse verb_forms if available
  if (verbForms && Array.isArray(verbForms)) {
    for (const vf of verbForms) {
      const tokens = vf.split(/[\s\/]+/).map((t) => t.replace(/[^a-zA-Z\-]/g, '').toLowerCase());
      for (const t of tokens) {
        if (
          t.length >= 2 &&
          !['simple', 'past', 'participle', 'form', 'present', 'he', 'she', 'it', 'they', 'you', 'we', 'i'].includes(t)
        ) {
          variants.add(t);
        }
      }
    }
  }

  // Check irregular verbs
  if (IRREGULAR_VERBS[base]) {
    for (const v of IRREGULAR_VERBS[base]) {
      variants.add(v);
    }
  }

  // Standard English inflections
  variants.add(base + 's');
  variants.add(base + 'es');
  variants.add(base + 'd');
  variants.add(base + 'ed');
  variants.add(base + 'ing');

  if (base.endsWith('e')) {
    variants.add(base.slice(0, -1) + 'ing');
    variants.add(base.slice(0, -1) + 'ed');
  }

  if (base.endsWith('y')) {
    variants.add(base.slice(0, -1) + 'ies');
    variants.add(base.slice(0, -1) + 'ied');
  }

  // Double consonant rule (e.g. stop -> stopped, stopping)
  if (/[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/i.test(base)) {
    const lastChar = base.slice(-1);
    variants.add(base + lastChar + 'ed');
    variants.add(base + lastChar + 'ing');
  }

  // Comparative and superlative
  variants.add(base + 'er');
  variants.add(base + 'est');
  if (base.endsWith('y')) {
    variants.add(base.slice(0, -1) + 'ier');
    variants.add(base.slice(0, -1) + 'iest');
  }

  // Adverb
  variants.add(base + 'ly');

  return Array.from(variants).filter((v) => v.length >= 2).sort((a, b) => b.length - a.length);
}

/**
 * Replaces occurrences of target word and its variants with a cloze gap [ ... ]
 */
export function maskWordInText(
  text: string,
  word: string,
  verbForms?: string[]
): { text: string; hasGap: boolean } {
  if (!text) return { text: '', hasGap: false };

  const variants = getWordVariants(word, verbForms);
  if (variants.length === 0) return { text, hasGap: false };

  const escaped = variants.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'gi');

  let hasGap = false;
  let masked = text.replace(regex, () => {
    hasGap = true;
    return '[ ... ]';
  });

  // Fallback: prefix stem matching if no direct match was found
  if (!hasGap && word.length >= 4) {
    const stem = word.slice(0, -2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fallbackRegex = new RegExp(`\\b${stem}[a-zA-Z]*\\b`, 'gi');
    masked = text.replace(fallbackRegex, () => {
      hasGap = true;
      return '[ ... ]';
    });
  }

  return { text: masked, hasGap };
}

/**
 * Intelligent cloze masking for Idioms & Multi-word Expressions
 * Handles placeholders (somebody/something, one's, sb/sth), irregular verbs, and slashes.
 */
export function maskIdiomInText(
  phrase: string,
  example: string
): { text: string; hasGap: boolean } {
  if (!phrase || !example) return { text: example || '', hasGap: false };

  // 1. Clean phrase: remove placeholder words and parentheses
  let cleaned = phrase.replace(/\((?:somebody|something|someone|sb|sth|one's|oneself|anybody|anything)[^\)]*\)/gi, '');
  cleaned = cleaned.replace(/\b(somebody|something|someone|one's|oneself|sb|sth|anybody|anything)\b/gi, '');
  
  const rawTokens = cleaned.split(/\s+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (rawTokens.length === 0) {
    return { text: example, hasGap: false };
  }

  const stemmedParts: string[] = [];
  for (const t of rawTokens) {
    if (t.includes('/')) {
      const alts = t.split('/').map((a) => a.trim().replace(/[^a-zA-Z\-]/g, '')).filter(Boolean);
      if (alts.length > 0) {
        stemmedParts.push('(?:' + alts.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')');
        continue;
      }
    }

    const cleanT = t.replace(/[^a-zA-Z\-]/g, '');
    if (!cleanT) continue;

    if (IRREGULAR_VERBS[cleanT]) {
      stemmedParts.push('(?:' + IRREGULAR_VERBS[cleanT].join('|') + ')');
    } else if (cleanT.length >= 4 && cleanT.endsWith('e')) {
      const stem = cleanT.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      stemmedParts.push(`\\b${stem}[a-zA-Z]*\\b`);
    } else {
      const esc = cleanT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      stemmedParts.push(`\\b${esc}[a-zA-Z]*\\b`);
    }
  }

  if (stemmedParts.length === 0) {
    return { text: example, hasGap: false };
  }

  // Match in sequence allowing up to 2 intervening words (e.g. pronouns or adjectives)
  const pattern = stemmedParts.join('\\s+(?:\\w+\\s+){0,2}');
  try {
    const reg = new RegExp(pattern, 'i');
    const match = reg.exec(example);
    if (match) {
      const masked = example.slice(0, match.index) + '[ ... ]' + example.slice(match.index + match[0].length);
      return { text: masked, hasGap: true };
    }
  } catch {}

  // Fallback: direct phrase match if possible
  const directClean = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const dReg = new RegExp(`\\b${directClean}\\b`, 'i');
    if (dReg.test(example)) {
      return { text: example.replace(dReg, '[ ... ]'), hasGap: true };
    }
  } catch {}

  return { text: example, hasGap: false };
}

/**
 * Builds a gold-standard active-retrieval flashcard for an Idiom.
 * Front: Meaning (definition) + Context Sentence with Cloze Gap [ ... ]
 * Back: Exact Idiom Phrase + Pronunciation audio + Full sentence
 */
export function buildOxfordIdiomFlashcard(
  idm: { phrase: string; definition?: string; examples?: string[] },
  parentWord: string = '',
  customNote: string = '',
  audio?: { uk?: string; us?: string },
  index: number = 0
): Flashcard {
  const definition = (idm.definition || '').trim();
  const examples = idm.examples || [];

  let maskedSentence = '';
  for (const ex of examples) {
    const res = maskIdiomInText(idm.phrase, ex);
    if (res.hasGap) {
      maskedSentence = res.text;
      break;
    }
  }

  // If no example matched with gap, but example exists: mask target phrase directly or append gap
  if (!maskedSentence && examples.length > 0) {
    const firstEx = examples[0];
    const res = maskWordInText(firstEx, parentWord);
    if (res.hasGap) {
      maskedSentence = res.text;
    } else {
      maskedSentence = `${firstEx} [ ... ]`;
    }
  }

  let prompt = '';
  if (definition && maskedSentence) {
    prompt = `Meaning: ${definition}\n\n"${maskedSentence}"`;
  } else if (maskedSentence) {
    prompt = `"${maskedSentence}"`;
  } else if (definition) {
    prompt = `Meaning: ${definition}\n\nIdiom: [ ... ]`;
  } else {
    prompt = `[ ... ]`;
  }

  return {
    id: `card-ox-idm-${Date.now().toString(36)}-${index}`,
    prompt,
    targetPhrase: idm.phrase,
    persianHint: customNote.trim() || (parentWord ? `Oxford Idioms (${parentWord})` : 'Oxford Idioms'),
    sourceBookId: 'Oxford Idioms',
    sourceUnit: parentWord || undefined,
    interval: 1,
    repetition: 0,
    easeFactor: 2.5,
    stability: 0,
    difficulty: 0,
    state: 0,
    dueDate: getTodayDateString(),
    lapses: 0,
    skillTag: 'Idioms & Phrases',
    createdAt: new Date().toISOString(),
    audioUk: audio?.uk,
    audioUs: audio?.us,
  };
}

/**
 * Builds a complete Cloze Flashcard prompt from an Oxford Word Detail:
 * First: Definition / explanation (without revealing the word)
 * Second: Example cloze sentence
 */
export function buildOxfordFlashcardPrompt(detail: OxfordWordDetail): string {
  const word = detail.word || '';
  const verbForms = detail.verb_forms || [];

  // Find a sense that has examples matching the word or any example
  let selectedSense = detail.senses?.find((s) => {
    const allEx = [...(s.examples || []), ...(s.extra_examples || [])];
    return allEx.some((ex) => maskWordInText(ex, word, verbForms).hasGap);
  });

  if (!selectedSense && detail.senses && detail.senses.length > 0) {
    selectedSense =
      detail.senses.find(
        (s) =>
          (s.examples && s.examples.length > 0) ||
          (s.extra_examples && s.extra_examples.length > 0)
      ) || detail.senses[0];
  }

  // Definition masked so it does not reveal the word
  const rawDef = selectedSense?.definition || '';
  const cleanDef = rawDef ? maskWordInText(rawDef, word, verbForms).text : '';

  // Example sentence masked
  const allExamples = [
    ...(selectedSense?.examples || []),
    ...(selectedSense?.extra_examples || []),
  ];
  let clozeSentence = '';

  for (const ex of allExamples) {
    const res = maskWordInText(ex, word, verbForms);
    if (res.hasGap) {
      clozeSentence = res.text;
      break;
    }
  }

  if (!clozeSentence && allExamples.length > 0) {
    clozeSentence = maskWordInText(allExamples[0], word, verbForms).text;
    if (!clozeSentence.includes('[ ... ]')) {
      clozeSentence = `${clozeSentence} [ ... ]`;
    }
  }

  if (cleanDef && clozeSentence) {
    return `Meaning: ${cleanDef}\n\n"${clozeSentence}"`;
  } else if (clozeSentence) {
    return `"${clozeSentence}"`;
  } else if (cleanDef) {
    return `Meaning: ${cleanDef}\n\n[ ... ]`;
  }

  return `[ ... ]`;
}
const COMMON_PREPOSITIONS = new Set([
  'for', 'on', 'in', 'at', 'to', 'with', 'from', 'about', 'by', 'into', 'onto',
  'towards', 'against', 'of', 'over', 'under', 'between', 'through', 'upon', 'as', 'out', 'up', 'down'
]);

function cleanOxfordSentence(text: string): string {
  if (!text) return '';
  // یکسان‌سازی فاصله‌های نازک و کاراکترهای مخفی یونیکد
  let t = text.replace(/[\u00a0\u2009\u202f\u200b]/g, ' ');
  // رفع چسبیدگی کلمات ناشی از فرمت‌بندی آکسفورد (مانند finallyreached -> finally reached)
  t = t.replace(/([a-z])(reached|reach|makes|make|took|taken|take|came|come|gets|got|get|had|have|felt|feel|found|find|said|say|told|tell|gave|give|went|gone|go|is|are|was|were|been|being)\b/gi, '$1 $2');
  return t.trim();
}

/**
 * تعیین نام چانک کلوکیشن بر اساس ترکیب واژه اصلی و آیتم کلوکیشن
 */
export function getCollocationChunkTitle(collocationItem: string, parentWord: string): string {
  const p = parentWord.trim();
  const c = collocationItem.trim().replace(/^[\(\[\{]/, '').replace(/[\)\]\}]$/, '');
  if (!p || !c) return c || p;
  if (c.toLowerCase().includes(p.toLowerCase())) return c;
  if (COMMON_PREPOSITIONS.has(c.toLowerCase())) return `${p} ${c}`;
  return `${c} ${p}`;
}

/**
 * ساخت فلش‌کارت کلوکیشن یا چانک (Collocation / Chunk Miner)
 * تمام مثال‌های لکسیکون را جستجو می‌کند تا دقیق‌ترین جمله‌ای که شامل هر دو کلمه است را بیابد،
 * چانک کامل (مثلاً keen for) را استخراج کرده و جای‌خالی می‌سازد.
 */
export function buildOxfordCollocationFlashcard(
  collocationItem: string,
  detail: OxfordWordDetail,
  senseIndex: number = 0,
  customNote: string = '',
  index: number = 0
): Flashcard {
  const parentWord = (detail.word || '').trim();
  const rawClean = collocationItem.trim().replace(/^[\(\[\{]/, '').replace(/[\)\]\}]$/, '');
  const options = rawClean.split('/').map((s) => s.trim()).filter(Boolean);
  const colOptions = options.length > 0 ? options : [rawClean];

  // جمع‌آوری جملات و معانی با اولویت سنس فعال
  const senses = detail.senses || [];
  const orderedSenses: any[] = [];
  if (senses[senseIndex]) {
    orderedSenses.push(senses[senseIndex]);
  }
  senses.forEach((s, idx) => {
    if (idx !== senseIndex) orderedSenses.push(s);
  });

  interface Candidate {
    sentence: string;
    definition: string;
  }
  const candidates: Candidate[] = [];

  for (const s of orderedSenses) {
    const d = s.definition || '';
    const allEx = [...(s.examples || []), ...(s.extra_examples || [])];
    for (const ex of allEx) {
      if (ex && ex.trim()) {
        candidates.push({ sentence: cleanOxfordSentence(ex), definition: d });
      }
    }
  }

  // اضافه کردن مثال‌های Idioms در صورت وجود
  for (const idm of detail.idioms || []) {
    const d = idm.definition || '';
    for (const ex of idm.examples || []) {
      if (ex && ex.trim()) {
        candidates.push({ sentence: cleanOxfordSentence(ex), definition: d });
      }
    }
  }

  const pEsc = parentWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let matchedSentence = '';
  let matchedChunk = '';
  let matchedDef = orderedSenses[0]?.definition || '';

  // ۱. جستجوی دقیق در جملات با الگوی تطابق دوطرفه
  for (const colOpt of colOptions) {
    const cEsc = colOpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // الف) اگر کلوکیشن خود شامل واژه مادر است (مثلاً as keen as mustard)
    if (colOpt.toLowerCase().includes(parentWord.toLowerCase())) {
      const reg = new RegExp(`\\b${cEsc}\\b`, 'i');
      for (const cand of candidates) {
        if (reg.test(cand.sentence)) {
          matchedSentence = cand.sentence;
          matchedChunk = colOpt;
          matchedDef = cand.definition;
          break;
        }
      }
      if (matchedSentence) break;
    }

    // ب) واژه اصلی سپس کلوکیشن با فاصله ۰ تا ۲ کلمه (مانند keen for, keen on, decision on)
    const p1 = new RegExp(`\\b${pEsc}\\w*\\b(?:\\s+\\w+){0,2}\\s+\\b${cEsc}\\b`, 'i');
    for (const cand of candidates) {
      const m = p1.exec(cand.sentence);
      if (m) {
        matchedSentence = cand.sentence;
        matchedChunk = m[0].trim();
        matchedDef = cand.definition;
        break;
      }
    }
    if (matchedSentence) break;

    // ج) کلوکیشن سپس واژه اصلی با فاصله ۰ تا ۲ کلمه (مانند extremely keen, reach a decision)
    const p2 = new RegExp(`\\b${cEsc}\\w*\\b(?:\\s+\\w+){0,2}\\s+\\b${pEsc}\\w*\\b`, 'i');
    for (const cand of candidates) {
      const m = p2.exec(cand.sentence);
      if (m) {
        matchedSentence = cand.sentence;
        matchedChunk = m[0].trim();
        matchedDef = cand.definition;
        break;
      }
    }
    if (matchedSentence) break;

    // د) وجود هم‌زمان هر دو کلمه در یک جمله
    for (const cand of candidates) {
      const hasP = new RegExp(`\\b${pEsc}`, 'i').test(cand.sentence);
      const hasC = new RegExp(`\\b${cEsc}\\b`, 'i').test(cand.sentence);
      if (hasP && hasC) {
        matchedSentence = cand.sentence;
        matchedDef = cand.definition;
        matchedChunk = getCollocationChunkTitle(colOpt, parentWord);
        break;
      }
    }
    if (matchedSentence) break;
  }

  // ۲. در صورت نبود جمله مشترک در دیتابیس، ساخت چانک استاندارد
  if (!matchedChunk) {
    matchedChunk = getCollocationChunkTitle(colOptions[0], parentWord);
  }

  // ۳. ایجاد جمله جای‌خالی (Cloze Masking)
  let clozeSentence = '';
  if (matchedSentence) {
    const chunkClean = matchedChunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const chunkRegex = new RegExp(chunkClean, 'i');
    if (chunkRegex.test(matchedSentence)) {
      clozeSentence = matchedSentence.replace(chunkRegex, '[ ... ]');
    } else {
      // اگر چانک دقیقا به صورت پیوسته نبود، کلمات را ماسک می‌کنیم
      const optEsc = colOptions[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      clozeSentence = matchedSentence
        .replace(new RegExp(`\\b${pEsc}\\w*\\b`, 'gi'), '[ ... ]')
        .replace(new RegExp(`\\b${optEsc}\\b`, 'gi'), '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
  } else {
    clozeSentence = `Collocation: [ ... ]`;
  }

  // ۴. ساخت پرامپت نهایی با تعریف معنی
  let prompt = '';
  const defClean = matchedDef ? `Meaning: ${matchedDef}` : '';
  if (defClean && clozeSentence) {
    prompt = `${defClean}\n\n"${clozeSentence}"`;
  } else if (clozeSentence) {
    prompt = `"${clozeSentence}"`;
  } else {
    prompt = `Collocation with "${parentWord}":\n\n[ ... ]`;
  }

  return {
    id: `card-ox-colloc-${Date.now().toString(36)}-${index}`,
    prompt,
    targetPhrase: matchedChunk,
    persianHint: customNote.trim() || `Collocation (${parentWord})`,
    sourceBookId: 'Collocations',
    sourceUnit: parentWord || undefined,
    interval: 1,
    repetition: 0,
    easeFactor: 2.5,
    stability: 0,
    difficulty: 0,
    state: 0,
    dueDate: getTodayDateString(),
    lapses: 0,
    skillTag: 'Collocation',
    createdAt: new Date().toISOString(),
    audioUk: detail.audio?.uk,
    audioUs: detail.audio?.us,
  };
}

export function buildSentenceClozeFlashcard(
  sentence: string,
  targetWord: string,
  definition: string = '',
  verbForms?: string[],
  audio?: { uk?: string; us?: string },
  customNote: string = '',
  index: number = 0
): Flashcard {
  const cleanWord = targetWord.trim();
  const maskedRes = maskWordInText(sentence, cleanWord, verbForms);
  const clozeSentence = maskedRes.hasGap ? maskedRes.text : `${sentence} [ ... ]`;

  const defPart = definition ? `Meaning: ${maskWordInText(definition, cleanWord, verbForms).text}` : '';
  const prompt = defPart ? `${defPart}\n\n"${clozeSentence}"` : `"${clozeSentence}"`;

  return {
    id: `card-ox-mine-${Date.now().toString(36)}-${index}`,
    prompt,
    targetPhrase: cleanWord,
    persianHint: customNote.trim() || `Oxford Example (${cleanWord})`,
    sourceBookId: 'Oxford 5000',
    sourceUnit: cleanWord || undefined,
    interval: 1,
    repetition: 0,
    easeFactor: 2.5,
    stability: 0,
    difficulty: 0,
    state: 0,
    dueDate: getTodayDateString(),
    lapses: 0,
    skillTag: 'Vocabulary',
    createdAt: new Date().toISOString(),
    audioUk: audio?.uk,
    audioUs: audio?.us,
  };
}
