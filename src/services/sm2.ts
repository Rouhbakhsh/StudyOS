import { Flashcard } from '../types';

export type ReviewGrade = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const today = new Date();
    today.setDate(today.getDate() + days);
    return today.toISOString().split('T')[0];
  }
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * SuperMemo SM-2 Spaced Repetition calculation
 */
export function calculateSM2(card: Flashcard, grade: ReviewGrade): Flashcard {
  const today = getTodayDateString();
  let repetition = card.repetition || 0;
  let interval = card.interval || 1;
  let easeFactor = card.easeFactor || 2.5;
  let lapses = card.lapses || 0;

  if (grade === 1) {
    // Again: Failure
    repetition = 0;
    interval = 1;
    lapses += 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (grade === 2) {
    // Hard: Successful recall with high cognitive effort
    interval = Math.max(1, Math.round((interval || 1) * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    repetition += 1;
  } else if (grade === 3) {
    // Good: Standard successful recall
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    // SM-2 Ease adjustment formula for Grade 4 (approx 3/4)
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)));
    repetition += 1;
  } else {
    // Easy: Immediate recall
    if (repetition === 0) {
      interval = 4;
    } else if (repetition === 1) {
      interval = 8;
    } else {
      interval = Math.round(interval * easeFactor * 1.3);
    }
    easeFactor = Math.min(3.0, easeFactor + 0.15);
    repetition += 1;
  }

  const dueDate = addDaysToDate(today, interval);

  return {
    ...card,
    repetition,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    dueDate,
    lastReviewedAt: today,
    lapses,
  };
}

/**
 * Get cards due today respecting the daily Overload Guard cap
 */
export function getDueCards(cards: Flashcard[], dailyCap: number = 30): Flashcard[] {
  const today = getTodayDateString();
  const due = cards.filter((c) => !c.dueDate || c.dueDate <= today);
  // Sort by overdue distance & lapses (most critical first)
  due.sort((a, b) => {
    if (a.dueDate < b.dueDate) return -1;
    if (a.dueDate > b.dueDate) return 1;
    return (b.lapses || 0) - (a.lapses || 0);
  });
  return due.slice(0, dailyCap);
}

/**
 * Cloze deletion parser for text with brackets [target] and optional Persian hint (معنی)
 * E.g., "I am [keen on] (علاقه‌مند بودن به) classical music."
 */
export interface ParsedCloze {
  prompt: string;
  targetPhrase: string;
  persianHint: string;
}

export function parseClozeString(rawText: string): ParsedCloze {
  let targetPhrase = '';
  let persianHint = '';

  // Match [target]
  const bracketMatch = rawText.match(/\[(.*?)\]/);
  if (bracketMatch) {
    targetPhrase = bracketMatch[1].trim();
  }

  // Match (persian hint in parentheses)
  const parenMatch = rawText.match(/\(([\u0600-\u06FF\s،؛.!?0-9\-]+)\)/);
  if (parenMatch) {
    persianHint = parenMatch[1].trim();
  }

  // Generate prompt with [ ... ]
  let prompt = rawText;
  if (bracketMatch) {
    prompt = prompt.replace(bracketMatch[0], '[ ... ]');
  }
  if (parenMatch) {
    prompt = prompt.replace(parenMatch[0], '').trim();
  }

  return {
    prompt: prompt.trim() || rawText,
    targetPhrase: targetPhrase || rawText,
    persianHint: persianHint || '',
  };
}
