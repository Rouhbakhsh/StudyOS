import { AppState } from '../types';
import { INITIAL_STATE } from '../data/seedData';
import { getPlanForDay, TOTAL_DAYS } from './scheduler';
import { addDaysToDate, getTodayDateString, parseLocalDate } from '../utils/date';

// تعداد روزهای تقویمی بین دو تاریخ محلی YYYY-MM-DD
export function daysBetween(from: string, to: string): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function isDayComplete(state: AppState, dayNumber: number): boolean {
  const plan = getPlanForDay(dayNumber);
  if (plan.isConsolidation) {
    return Boolean(state.consolidationRecords?.[plan.weekNumber]?.completed);
  }
  return plan.slots.every((s) => Boolean(state.unitProgress[`${s.bookId}_${s.unit}`]?.completed));
}

// تاریخ پایان تخمینی برنامه اگر از امروز هر روز یک روز برنامه انجام شود
export function estimateFinishDate(activeDay: number, today: string = getTodayDateString()): string {
  return addDaysToDate(today, Math.max(0, TOTAL_DAYS - activeDay));
}

export interface RolloverResult {
  state: AppState;
  changed: boolean;
  missedDays: number; // روزهایی که برنامه به خاطر جاماندن خودکار جلو رفت
  finishedDay: number | null; // آخرین روزی که کامل شد و از آن عبور کردیم
  activeDay: number;
}

/**
 * با شروع هر روز جدید اجرا می‌شود:
 * ۱. از روی روزهای کامل‌شده عبور می‌کند (اگر جلوتر کار کرده باشی، چند روز جلو می‌رود)
 * ۲. اگر از برنامه عقب افتاده باشی، برنامه خودکار جلو می‌رود و چیزی جا نمی‌ماند
 */
export function applyDayRollover(state: AppState, today: string = getTodayDateString()): RolloverResult {
  const settings = state.settings;
  const startActive = settings.currentActiveDay || 1;

  if (!settings.onboardedAt || settings.lastOpenedDate === today) {
    return { state, changed: false, missedDays: 0, finishedDay: null, activeDay: startActive };
  }

  let active = startActive;
  while (active < TOTAL_DAYS && isDayComplete(state, active)) active++;

  const shifted = settings.shiftedDays || 0;
  const planStart = settings.planStartDate || today;
  const expectedDay = Math.min(TOTAL_DAYS, daysBetween(planStart, today) + 1 - shifted);
  const missedDays = Math.max(0, expectedDay - active);

  return {
    state: {
      ...state,
      settings: {
        ...settings,
        currentActiveDay: active,
        shiftedDays: shifted + missedDays,
        lastOpenedDate: today,
      },
    },
    changed: true,
    missedDays,
    finishedDay: active > startActive ? active - 1 : null,
    activeDay: active,
  };
}

// داده‌های قدیمی (قبل از صفحه شروع) تاریخ شروع ندارند؛ طوری حساب می‌شود که امروز دقیقاً روی برنامه باشی
export function migratePlanDates(settings: AppState['settings'], today: string = getTodayDateString()): AppState['settings'] {
  const next = { ...settings };
  if (!next.onboardedAt) {
    next.onboardedAt = next.lastOpenedDate || today;
  }
  if (!next.planStartDate) {
    const offset = (next.currentActiveDay || 1) - 1 + (next.shiftedDays || 0);
    next.planStartDate = addDaysToDate(today, -offset);
  }
  return next;
}

// شروع واقعی برنامه: داده‌های نمونه پاک می‌شوند و روز ۱ از امروز آغاز می‌شود
export function createFreshPlanState(learnerName: string, today: string = getTodayDateString()): AppState {
  return {
    ...INITIAL_STATE,
    settings: {
      ...INITIAL_STATE.settings,
      currentActiveDay: 1,
      shiftedDays: 0,
      onboardedAt: today,
      planStartDate: today,
      lastOpenedDate: today,
      learnerName: learnerName.trim() || undefined,
    },
    unitProgress: {},
    flashcards: [],
    mistakes: [],
    sprints: [],
    lexicon: [],
    timerSessions: [],
    consolidationRecords: {},
    todayRitual: {},
    lexiconNotes: {},
  };
}
