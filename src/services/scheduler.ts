import { CURRICULUM_BOOKS } from '../data/curriculumData';
import { BookId, DayPlan, ScheduledSlot, CurriculumBook } from '../types';

export const TOTAL_DAYS = 144;
export const TOTAL_WEEKS = 24;
export const DAYS_PER_WEEK = 6;

// Helper to get book by ID
export function getBook(bookId: BookId): CurriculumBook {
  const book = CURRICULUM_BOOKS.find((b) => b.book_id === bookId);
  if (!book) {
    throw new Error(`Book ${bookId} not found`);
  }
  return book;
}

// Deterministic chunker: splits an array of items into N buckets as evenly as possible
function distributeEvenly<T>(items: T[], bucketCount: number): T[][] {
  const buckets: T[][] = Array.from({ length: bucketCount }, () => []);
  const total = items.length;

  for (let i = 0; i < total; i++) {
    const bucketIndex = Math.floor((i * bucketCount) / total);
    buckets[Math.min(bucketIndex, bucketCount - 1)].push(items[i]);
  }

  return buckets;
}

// Generate the master 144-day schedule
export function generateCurriculumSchedule(): DayPlan[] {
  const schedule: DayPlan[] = [];

  // 1. Prepare unit slices for each phase
  const bgiuUnits = getBook('BGIU').units; // 113 units -> Phase 1 (40 active days)
  const egiuUnits = getBook('EGIU').units; // 145 units -> Phase 2 (units 0..74, 75 units), Phase 3 (units 75..144, 70 units)
  const owsElUnits = getBook('OWS-EL').units; // 100 units -> Phase 1 (40 active days)
  const owsIntUnits = getBook('OWS-INT').units; // 100 units -> Phase 2 (40 active days)
  const owsAdvUnits = getBook('OWS-ADV').units; // 100 units -> Phase 3 (40 active days)
  const aatUnits = getBook('AAT').units; // 20 units -> across 72 active pronunciation sessions

  const collIntUnits = getBook('COLL-INT').units; // 60 units -> Phase 2
  const pvIntUnits = getBook('PV-INT').units; // 70 units -> Phase 2
  const phase2Phraseology = [...collIntUnits.map((u) => ({ ...u, bookId: 'COLL-INT' as BookId })), ...pvIntUnits.map((u) => ({ ...u, bookId: 'PV-INT' as BookId }))];

  const collAdvUnits = getBook('COLL-ADV').units; // 60 units -> Phase 3
  const pvAdvUnits = getBook('PV-ADV').units; // 60 units -> Phase 3
  const phase3Phraseology = [...collAdvUnits.map((u) => ({ ...u, bookId: 'COLL-ADV' as BookId })), ...pvAdvUnits.map((u) => ({ ...u, bookId: 'PV-ADV' as BookId }))];

  // Distribute over 40 active days per phase (5 days * 8 weeks)
  const bgiuBuckets = distributeEvenly(bgiuUnits, 40);
  const owsElBuckets = distributeEvenly(owsElUnits, 40);

  const egiuPhase2Buckets = distributeEvenly(egiuUnits.slice(0, 75), 40);
  const owsIntBuckets = distributeEvenly(owsIntUnits, 40);
  const phraseologyP2Buckets = distributeEvenly(phase2Phraseology, 40);

  const egiuPhase3Buckets = distributeEvenly(egiuUnits.slice(75), 40);
  const owsAdvBuckets = distributeEvenly(owsAdvUnits, 40);
  const phraseologyP3Buckets = distributeEvenly(phase3Phraseology, 40);

  // AAT distribution across 72 total pronunciation sessions (Days 1, 3, 5 of each week)
  // Phase 1 (24 sessions): AAT 1-10
  // Phase 2 (24 sessions): AAT 11-20
  // Phase 3 (24 sessions): Shadowing & Acoustic Synthesis
  const aatP1 = aatUnits.slice(0, 10);
  const aatP2 = aatUnits.slice(10, 20);
  const aatP3 = aatUnits; // Review & synthesis

  const aatP1Buckets = distributeEvenly(aatP1, 24);
  const aatP2Buckets = distributeEvenly(aatP2, 24);
  const aatP3Buckets = distributeEvenly(aatP3, 24);

  let activeDayP1Counter = 0;
  let activeDayP2Counter = 0;
  let activeDayP3Counter = 0;

  let aatP1Counter = 0;
  let aatP2Counter = 0;
  let aatP3Counter = 0;

  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const weekNumber = Math.ceil(day / DAYS_PER_WEEK);
    const dayOfWeek = ((day - 1) % DAYS_PER_WEEK) + 1; // 1..6
    const isConsolidation = dayOfWeek === 6;

    let phase: 1 | 2 | 3 = 1;
    let phaseLabel = 'Phase 1: A1 → A2 (Weeks 1–8)';
    let targetCefr = 'A1 → A2';

    if (weekNumber > 16) {
      phase = 3;
      phaseLabel = 'Phase 3: B2 → C1 (Weeks 17–24)';
      targetCefr = 'B2 → C1 (IELTS 7.5)';
    } else if (weekNumber > 8) {
      phase = 2;
      phaseLabel = 'Phase 2: B1 → B2 (Weeks 9–16)';
      targetCefr = 'B1 → B2';
    }

    const slots: ScheduledSlot[] = [];

    if (!isConsolidation) {
      const isPronunciationDay = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
      const isPhraseologyDrillDay = dayOfWeek === 2 || dayOfWeek === 4;

      if (phase === 1) {
        const activeIdx = activeDayP1Counter++;

        // Slot 1: Grammar (BGIU)
        const bgiuItems = bgiuBuckets[activeIdx] || [];
        bgiuItems.forEach((unitItem) => {
          slots.push({
            slotNumber: 1,
            focusArea: 'Grammar',
            bookId: 'BGIU',
            bookTitle: 'Basic Grammar in Use',
            unit: unitItem.unit,
            title: unitItem.title,
            skill: 'Grammar',
            targetLevel: 'A1-A2',
          });
        });

        // Slot 2: Core Vocabulary (OWS-EL)
        const owsElItems = owsElBuckets[activeIdx] || [];
        owsElItems.forEach((unitItem) => {
          slots.push({
            slotNumber: 2,
            focusArea: 'Core Vocabulary',
            bookId: 'OWS-EL',
            bookTitle: 'Oxford Word Skills Elementary',
            unit: unitItem.unit,
            title: unitItem.title,
            skill: 'Vocabulary',
            targetLevel: 'A1-A2',
          });
        });

        // Slot 3: Pronunciation & Accent (AAT Part 1) on Days 1, 3, 5
        if (isPronunciationDay) {
          const aatIdx = aatP1Counter++;
          const aatItems = aatP1Buckets[aatIdx] || [];
          aatItems.forEach((unitItem) => {
            slots.push({
              slotNumber: 3,
              focusArea: 'Pronunciation & Accent',
              bookId: 'AAT',
              bookTitle: 'American Accent Training',
              unit: unitItem.unit,
              title: unitItem.title,
              skill: 'Speaking & Pronunciation',
              targetLevel: 'A2-B2',
            });
          });
        }

        // Slot 4: Grammar Deep Application Drill on Days 2, 4
        if (isPhraseologyDrillDay) {
          slots.push({
            slotNumber: 4,
            focusArea: 'Grammar Mastery & Sentence Synthesis',
            bookId: 'BGIU',
            bookTitle: 'Basic Grammar in Use (Synthesis)',
            unit: `App-${activeIdx + 1}`,
            title: 'Deliberate Output & Sentence Construction Drill',
            skill: 'Grammar',
            targetLevel: 'A1-A2',
          });
        }
      } else if (phase === 2) {
        const activeIdx = activeDayP2Counter++;

        // Slot 1: Grammar (EGIU Part 1)
        const egiuItems = egiuPhase2Buckets[activeIdx] || [];
        egiuItems.forEach((unitItem) => {
          slots.push({
            slotNumber: 1,
            focusArea: 'Grammar',
            bookId: 'EGIU',
            bookTitle: 'English Grammar in Use',
            unit: unitItem.unit,
            title: unitItem.title,
            skill: 'Grammar',
            targetLevel: 'B1-B2',
          });
        });

        // Slot 2: Core Vocabulary (OWS-INT)
        const owsIntItems = owsIntBuckets[activeIdx] || [];
        owsIntItems.forEach((unitItem) => {
          slots.push({
            slotNumber: 2,
            focusArea: 'Core Vocabulary',
            bookId: 'OWS-INT',
            bookTitle: 'Oxford Word Skills Intermediate',
            unit: unitItem.unit,
            title: unitItem.title,
            skill: 'Vocabulary',
            targetLevel: 'B1-B2',
          });
        });

        // Slot 3: Pronunciation (AAT Part 2) on Days 1, 3, 5
        if (isPronunciationDay) {
          const aatIdx = aatP2Counter++;
          const aatItems = aatP2Buckets[aatIdx] || [];
          aatItems.forEach((unitItem) => {
            slots.push({
              slotNumber: 3,
              focusArea: 'Pronunciation & Accent',
              bookId: 'AAT',
              bookTitle: 'American Accent Training',
              unit: unitItem.unit,
              title: unitItem.title,
              skill: 'Speaking & Pronunciation',
              targetLevel: 'A2-B2',
            });
          });
        }

        // Slot 4: Phraseology (COLL-INT + PV-INT)
        const phraseItems = phraseologyP2Buckets[activeIdx] || [];
        phraseItems.forEach((item) => {
          const isColl = item.bookId === 'COLL-INT';
          slots.push({
            slotNumber: 4,
            focusArea: isColl ? 'Collocations' : 'Phrasal Verbs',
            bookId: item.bookId,
            bookTitle: isColl
              ? 'English Collocations in Use Intermediate'
              : 'English Phrasal Verbs in Use Intermediate',
            unit: item.unit,
            title: item.title,
            skill: isColl ? 'Collocations' : 'Phrasal Verbs',
            targetLevel: 'B1-B2',
          });
        });
      } else {
        const activeIdx = activeDayP3Counter++;

        // Slot 1: Advanced Grammar (EGIU Part 2)
        const egiuItems = egiuPhase3Buckets[activeIdx] || [];
        egiuItems.forEach((unitItem) => {
          slots.push({
            slotNumber: 1,
            focusArea: 'Grammar',
            bookId: 'EGIU',
            bookTitle: 'English Grammar in Use',
            unit: unitItem.unit,
            title: unitItem.title,
            skill: 'Grammar',
            targetLevel: 'B2-C1',
          });
        });

        // Slot 2: Advanced Vocabulary (OWS-ADV)
        const owsAdvItems = owsAdvBuckets[activeIdx] || [];
        owsAdvItems.forEach((unitItem) => {
          slots.push({
            slotNumber: 2,
            focusArea: 'Advanced Vocabulary',
            bookId: 'OWS-ADV',
            bookTitle: 'Oxford Word Skills Advanced (2nd Ed)',
            unit: unitItem.unit,
            title: unitItem.title,
            skill: 'Advanced Vocabulary',
            targetLevel: 'B2-C1',
          });
        });

        // Slot 3: Advanced Shadowing Synthesis (AAT) on Days 1, 3, 5
        if (isPronunciationDay) {
          const aatIdx = aatP3Counter++;
          const aatItems = aatP3Buckets[aatIdx] || [];
          aatItems.forEach((unitItem) => {
            slots.push({
              slotNumber: 3,
              focusArea: 'Acoustic Shadowing Synthesis',
              bookId: 'AAT',
              bookTitle: 'American Accent Training (Synthesis)',
              unit: unitItem.unit,
              title: unitItem.title,
              skill: 'Speaking & Pronunciation',
              targetLevel: 'B2-C1',
            });
          });
        }

        // Slot 4: Advanced Phraseology (COLL-ADV + PV-ADV)
        const phraseItems = phraseologyP3Buckets[activeIdx] || [];
        phraseItems.forEach((item) => {
          const isColl = item.bookId === 'COLL-ADV';
          slots.push({
            slotNumber: 4,
            focusArea: isColl ? 'Advanced Collocations' : 'Advanced Phrasal Verbs',
            bookId: item.bookId,
            bookTitle: isColl
              ? 'English Collocations in Use Advanced'
              : 'English Phrasal Verbs in Use Advanced',
            unit: item.unit,
            title: item.title,
            skill: isColl ? 'Advanced Collocations' : 'Advanced Phrasal Verbs',
            targetLevel: 'B2-C1',
          });
        });
      }
    }

    schedule.push({
      dayNumber: day,
      weekNumber,
      dayOfWeek,
      isConsolidation,
      phase,
      phaseLabel,
      targetCefr,
      slots,
    });
  }

  return schedule;
}

// Master pre-computed schedule singleton
export const MASTER_SCHEDULE: DayPlan[] = generateCurriculumSchedule();

// Quick lookup mapping for unit -> { dayNumber, slotNumber }
export interface UnitLocation {
  dayNumber: number;
  slotNumber: number;
  weekNumber: number;
  phase: number;
  bookId: BookId;
  unit: string;
  title: string;
  skill: string;
}

export const UNIT_LOCATION_INDEX: Map<string, UnitLocation[]> = new Map();

MASTER_SCHEDULE.forEach((plan) => {
  plan.slots.forEach((slot) => {
    const key = `${slot.bookId}_${slot.unit}`;
    const list = UNIT_LOCATION_INDEX.get(key) || [];
    list.push({
      dayNumber: plan.dayNumber,
      slotNumber: slot.slotNumber,
      weekNumber: plan.weekNumber,
      phase: plan.phase,
      bookId: slot.bookId,
      unit: slot.unit,
      title: slot.title,
      skill: slot.skill,
    });
    UNIT_LOCATION_INDEX.set(key, list);
  });
});

export function getPlanForDay(dayNumber: number): DayPlan {
  const normalized = Math.max(1, Math.min(TOTAL_DAYS, dayNumber));
  return MASTER_SCHEDULE[normalized - 1];
}
