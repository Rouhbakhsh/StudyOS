export type BookId =
  | 'AAT'
  | 'BGIU'
  | 'EGIU'
  | 'OWS-EL'
  | 'OWS-INT'
  | 'OWS-ADV'
  | 'COLL-INT'
  | 'COLL-ADV'
  | 'PV-INT'
  | 'PV-ADV';

export type SkillCategory =
  | 'Grammar'
  | 'Vocabulary'
  | 'Advanced Vocabulary'
  | 'Collocations'
  | 'Advanced Collocations'
  | 'Phrasal Verbs'
  | 'Advanced Phrasal Verbs'
  | 'Speaking & Pronunciation';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'A1-A2' | 'B1-B2' | 'B2-C1' | 'A2-B2';

export interface CurriculumUnit {
  unit: string;
  title: string;
}

export interface CurriculumBook {
  book_id: BookId;
  book_title: string;
  target_level: CEFRLevel;
  skill: SkillCategory;
  units: CurriculumUnit[];
}

export interface ScheduledSlot {
  slotNumber: 1 | 2 | 3 | 4;
  focusArea: string;
  bookId: BookId;
  bookTitle: string;
  unit: string;
  title: string;
  skill: SkillCategory;
  targetLevel: CEFRLevel;
}

export interface DayPlan {
  dayNumber: number; // 1..144
  weekNumber: number; // 1..24
  dayOfWeek: number; // 1..6 (1-5 Active Mission, 6 Consolidation)
  isConsolidation: boolean;
  phase: 1 | 2 | 3;
  phaseLabel: string;
  targetCefr: string;
  slots: ScheduledSlot[];
}

export interface UnitProgress {
  completed: boolean;
  completedAt?: string;
  timeSpentSeconds: number;
  keyNotes: string;
  // Grammar sub-gates
  solvedRightPageExercises?: boolean;
  sentences?: [string, string, string];
  // Vocabulary sub-gates
  extractedCloze?: string;
  extractedClozeList?: string[];
  scenarioDone?: boolean;
  // Pronunciation sub-gates
  shadowingDone?: boolean;
  linkingNotes?: string;
}

export interface Flashcard {
  id: string;
  sourceBookId?: BookId | string;
  sourceUnit?: string;
  prompt: string; // May contain [target] or [ ... ]
  targetPhrase: string;
  persianHint: string;
  interval: number; // In days
  repetition: number;
  easeFactor: number; // e.g. 2.5
  dueDate: string; // YYYY-MM-DD
  lastReviewedAt?: string;
  lapses: number;
  skillTag: string;
  createdAt: string;
  // مسیر فایل‌های صوتی محلی آکسفورد (آفلاین)
  audioUk?: string;
  audioUs?: string;
  // FSRS fields
  stability?: number;
  difficulty?: number;
  state?: number; // 0: New, 1: Learning, 2: Review, 3: Relearning
  lastReview?: string;
}

export type MistakeCategory =
  | 'Prepositions'
  | 'Collocations'
  | 'Tenses'
  | 'Articles'
  | 'False Friends'
  | 'Word Choice'
  | 'Pronunciation';

export interface MistakeEntry {
  id: string;
  error: string;
  correction: string;
  rule: string;
  persianNote: string;
  category: MistakeCategory;
  sourceBookUnit?: string;
  createdAt: string;
  status: 'unresolved' | 'mastered';
  flashcardCreated?: boolean;
}

export interface SprintEntry {
  id: string;
  title: string;
  prompt: string;
  text: string;
  wordCount: number;
  durationMinutes: number;
  createdAt: string;
  origin: 'DAILY' | 'FREE_SPRINT' | 'STUDIO_FOCUS';
  dayNumber?: number;
}

export interface LexiconWord {
  id: string;
  word: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'idiom';
  phonetic: string;
  definition: string;
  persian: string;
  example: string;
  collocations?: string[];
  inFlashcards?: boolean;
}

export interface TimerSession {
  id: string;
  mode: 'input' | 'output';
  skill: 'Reading' | 'Listening' | 'Shadowing' | 'Writing' | 'Grammar' | 'Vocabulary' | 'Speaking';
  durationSeconds: number;
  timestamp: string;
  note?: string;
}

export interface ConsolidationWeekRecord {
  flashcardsCleared: boolean;
  mistakesReviewed: boolean;
  shadowingDone: boolean;
  shadowingSeconds: number;
  completed: boolean;
  completedAt?: string;
}

export interface SystemSettings {
  soundEnabled: boolean;
  soundVolume: number;
  vocalRestGuard: boolean;
  dailyReviewCap: number; // 10 to 60, default 30
  shiftedDays: number;
  currentActiveDay: number;
  autoBackupEnabled: boolean;
  lastBackupDate?: string;
  lastOpenedDate?: string;
  onboardedAt?: string;
  planStartDate?: string;
  learnerName?: string;
}

export interface ActiveTodayRitual {
  shadowingSeconds: number;
  sprintCompleted: boolean;
  dailyFlashcardReviewedCount: number;
  dailyFlashcardsGoalCleared: boolean;
}

export interface AppState {
  version: number;
  settings: SystemSettings;
  unitProgress: Record<string, UnitProgress>; // key: `${bookId}_${unit}`
  flashcards: Flashcard[];
  mistakes: MistakeEntry[];
  sprints: SprintEntry[];
  lexicon: LexiconWord[];
  timerSessions: TimerSession[];
  consolidationRecords: Record<number, ConsolidationWeekRecord>; // key: weekNumber
  todayRitual: Record<number, ActiveTodayRitual>; // key: dayNumber
  lexiconNotes?: Record<string, string>; // Persian translations & notes
}