import { Flashcard } from '../types';
import { addDaysToDate, getTodayDateString, parseLocalDate } from '../utils/date';

export type ReviewGrade = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface FSRSParameters {
  requestRetention: number; // e.g. 0.9 (90% target retention)
  maximumInterval: number; // e.g. 365 days
  w: number[];
}

export const DEFAULT_FSRS_PARAMS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 365,
  w: [
    0.4, 0.9, 2.3, 10.9, // 0..3: S0(Again, Hard, Good, Easy)
    4.93, 0.94, // 4..5: D0 params
    0.86, 0.01, // 6..7: D update and mean reversion
    1.49, 0.14, 0.94, // 8..10: S update on recall
    2.18, 0.05, 0.34, 1.26, // 11..14: S update on lapse
  ],
};

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Retrievability calculation: R(t, S) = (1 + 19/81 * (t / S))^(-0.5)
 */
export function calculateRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  const factor = 19 / 81;
  return Math.pow(1 + factor * (elapsedDays / stability), -0.5);
}

/**
 * Calculates next interval from stability and desired target retention
 */
export function calculateInterval(stability: number, targetRetention: number = 0.9, maxInterval: number = 365): number {
  if (stability <= 0) return 1;
  const factor = 19 / 81;
  // I = S / factor * (R^(-1/0.5) - 1)
  const interval = (stability / factor) * (Math.pow(targetRetention, -2) - 1);
  return clamp(Math.round(interval), 1, maxInterval);
}

/**
 * Core FSRS algorithm for card review scheduling
 */
export function calculateFSRS(
  card: Flashcard,
  grade: ReviewGrade,
  params: FSRSParameters = DEFAULT_FSRS_PARAMS
): Flashcard {
  const today = getTodayDateString();
  const { w, requestRetention, maximumInterval } = params;

  // Initialize or inherit existing stability and difficulty
  const isInitial = card.repetition === 0 && !card.stability;

  let difficulty: number;
  let stability: number;
  let lapses = card.lapses || 0;
  let repetition = card.repetition || 0;

  // Elapsed days since last review
  let elapsedDays = 0;
  if (card.lastReviewedAt) {
    const lastDate = parseLocalDate(card.lastReviewedAt);
    const currDate = parseLocalDate(today);
    if (lastDate && currDate) {
      elapsedDays = Math.max(0, Math.round((currDate.getTime() - lastDate.getTime()) / 86400000));
    }
  }

  if (isInitial) {
    // First review ever
    // D0(G) = clamp(w4 - (G - 3) * w5, 1, 10)
    difficulty = clamp(w[4] - (grade - 3) * w[5], 1, 10);
    // S0(G) = w[G - 1]
    stability = Math.max(0.1, w[grade - 1]);
  } else {
    // Existing card (migrated from SM-2 or previous FSRS)
    const prevDifficulty =
      card.difficulty ?? clamp(11 - (card.easeFactor || 2.5) * 2.4, 1, 10);
    const prevStability = card.stability ?? Math.max(0.5, card.interval || 1);

    // Retrievability at review time
    const R = calculateRetrievability(elapsedDays || (card.interval || 1), prevStability);

    // Difficulty update: D' = D - w6 * (G - 3)
    // Mean reversion: D_next = w7 * D0(3) + (1 - w7) * D'
    const dPrime = prevDifficulty - w[6] * (grade - 3);
    const d0Good = w[4];
    difficulty = clamp(w[7] * d0Good + (1 - w[7]) * dPrime, 1, 10);

    if (grade === 1) {
      // Lapse (Again)
      lapses += 1;
      repetition = 0;
      // S_lapse = min(S, w11 * D^(-w12) * ((S+1)^w13 - 1) * exp((1-R)*w14))
      const lapseS =
        w[11] *
        Math.pow(difficulty, -w[12]) *
        (Math.pow(prevStability + 1, w[13]) - 1) *
        Math.exp((1 - R) * w[14]);
      stability = clamp(lapseS, 0.1, prevStability);
    } else {
      // Recall Success (Hard, Good, Easy)
      repetition += 1;
      let hardPenalty = 1.0;
      let easyBonus = 1.0;
      if (grade === 2) hardPenalty = 0.8;
      if (grade === 4) easyBonus = 1.3;

      // S_recall = S * (1 + exp(w8) * (11 - D) * S^(-w9) * (exp((1 - R) * w10) - 1) * hardPenalty * easyBonus)
      const recallFactor =
        Math.exp(w[8]) *
        (11 - difficulty) *
        Math.pow(prevStability, -w[9]) *
        (Math.exp((1 - R) * w[10]) - 1) *
        hardPenalty *
        easyBonus;

      stability = Math.max(prevStability + 0.1, prevStability * (1 + recallFactor));
    }
  }

  // Next optimal interval
  let interval: number;
  if (grade === 1) {
    interval = 1;
  } else {
    interval = calculateInterval(stability, requestRetention, maximumInterval);
    // Hard rating minimal interval progression
    if (grade === 2 && card.interval) {
      interval = Math.max(1, Math.min(interval, Math.round(card.interval * 1.2)));
    }
  }

  const dueDate = addDaysToDate(today, interval);

  return {
    ...card,
    stability: Number(stability.toFixed(2)),
    difficulty: Number(difficulty.toFixed(2)),
    interval,
    repetition,
    lapses,
    dueDate,
    lastReviewedAt: today,
    easeFactor: Number(clamp(2.5 + (repetition * 0.1) - (lapses * 0.2), 1.3, 3.2).toFixed(2)),
  };
}

/**
 * Legacy alias for backwards compatibility
 */
export const calculateSM2 = calculateFSRS;

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
    prompt = rawText.replace(/\[(.*?)\]/, '[ ... ]');
    if (parenMatch) {
      prompt = prompt.replace(/\(([\u0600-\u06FF\s،؛.!?0-9\-]+)\)/, '').trim();
    }
  }

  return { prompt: prompt.trim(), targetPhrase, persianHint };
}

