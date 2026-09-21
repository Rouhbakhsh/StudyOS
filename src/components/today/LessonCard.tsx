import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Timer,
  AlertCircle,
} from 'lucide-react';
import { ScheduledSlot, UnitProgress, Flashcard } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { parseClozeString } from '../../services/sm2';
import { playSound } from '../../services/audio';

interface LessonCardProps {
  slot: ScheduledSlot;
  missionNumber: number;
  progress: UnitProgress;
  onUpdateProgress: (unitKey: string, updates: Partial<UnitProgress>) => void;
  onCompleteUnit: (unitKey: string, timeSpent: number) => void;
  onAddFlashcard: (card: Flashcard) => void;
  onInspectUnit: (bookId: string, unit: string) => void;
  soundEnabled: boolean;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  slot,
  missionNumber,
  progress,
  onUpdateProgress,
  onCompleteUnit,
  onAddFlashcard,
  onInspectUnit,
  soundEnabled,
}) => {
  const unitKey = `${slot.bookId}_${slot.unit}`;
  const isCompleted = progress.completed;

  // Inline stopwatch state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(progress.timeSpentSeconds || 0);
  const timerRef = useRef<number | null>(null);

  // Sub-gates state (local + synced)
  const [notesOpen, setNotesOpen] = useState(Boolean(progress.keyNotes));
  const [keyNotes, setKeyNotes] = useState(progress.keyNotes || '');

  // Grammar sub-gates
  const [solvedRightPage, setSolvedRightPage] = useState(Boolean(progress.solvedRightPageExercises));
  const [sent1, setSent1] = useState(progress.sentences?.[0] || '');
  const [sent2, setSent2] = useState(progress.sentences?.[1] || '');
  const [sent3, setSent3] = useState(progress.sentences?.[2] || '');

  // Vocab sub-gates
  const [clozeExtraction, setClozeExtraction] = useState(progress.extractedCloze || '');
  const [scenarioDone, setScenarioDone] = useState(Boolean(progress.scenarioDone));
  const [scenarioTimer, setScenarioTimer] = useState<number | null>(null);

  // Pronunciation sub-gates
  const [shadowingDone, setShadowingDone] = useState(Boolean(progress.shadowingDone));
  const [linkingNotes, setLinkingNotes] = useState(progress.linkingNotes || '');

  const [clozeNotification, setClozeNotification] = useState<string | null>(null);

  // Sync timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Handle scenario 2-minute timer
  useEffect(() => {
    let interval: number | null = null;
    if (scenarioTimer !== null && scenarioTimer > 0) {
      interval = window.setInterval(() => {
        setScenarioTimer((prev) => {
          if (prev === null || prev <= 1) {
            setScenarioDone(true);
            playSound('complete', soundEnabled);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scenarioTimer, soundEnabled]);

  const handleNotesChange = (val: string) => {
    setKeyNotes(val);
    onUpdateProgress(unitKey, { keyNotes: val });
  };

  const handleGrammarCheck = (checked: boolean) => {
    setSolvedRightPage(checked);
    onUpdateProgress(unitKey, { solvedRightPageExercises: checked });
  };

  const handleSentencesUpdate = (s1: string, s2: string, s3: string) => {
    setSent1(s1);
    setSent2(s2);
    setSent3(s3);
    onUpdateProgress(unitKey, { sentences: [s1, s2, s3] });
  };

  const handleClozeExtractionChange = (val: string) => {
    setClozeExtraction(val);
    onUpdateProgress(unitKey, { extractedCloze: val });
  };

  const handleAddClozeToFlashcards = () => {
    if (!clozeExtraction.trim()) return;
    const parsed = parseClozeString(clozeExtraction);

    const newCard: Flashcard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceBookId: slot.bookId,
      sourceUnit: slot.unit,
      prompt: parsed.prompt,
      targetPhrase: parsed.targetPhrase,
      persianHint: parsed.persianHint || 'استخراج شده از درس',
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      dueDate: new Date().toISOString().split('T')[0],
      lapses: 0,
      skillTag: slot.skill,
      createdAt: new Date().toISOString(),
    };

    onAddFlashcard(newCard);
    playSound('complete', soundEnabled);
    setClozeNotification(`Added Flashcard: "${parsed.targetPhrase}"`);
    setTimeout(() => setClozeNotification(null), 4000);
  };

  // Sub-gate verification logic
  const isGrammar = slot.skill.includes('Grammar');
  const isVocabOrPhrase =
    slot.skill.includes('Vocabulary') ||
    slot.skill.includes('Collocations') ||
    slot.skill.includes('Phrasal');
  const isPronunciation = slot.skill.includes('Speaking') || slot.skill.includes('Pronunciation');

  let canComplete = false;
  let missingRequirement = '';

  if (isGrammar) {
    const hasSentences = sent1.trim().length > 3 && sent2.trim().length > 3 && sent3.trim().length > 3;
    canComplete = solvedRightPage && hasSentences;
    if (!solvedRightPage) missingRequirement = 'Check "Solved exercises on right page"';
    else if (!hasSentences) missingRequirement = 'Write 3 personalized sentences using target structure';
  } else if (isVocabOrPhrase) {
    canComplete = (clozeExtraction.trim().length > 3 || scenarioDone);
    if (!canComplete) missingRequirement = 'Extract a cloze expression or complete the 2m mental scenario';
  } else if (isPronunciation) {
    canComplete = shadowingDone;
    if (!canComplete) missingRequirement = 'Check "Completed acoustic shadowing drills"';
  } else {
    canComplete = true;
  }

  const handleCompleteToggle = () => {
    if (isCompleted) {
      // Toggle back to pending
      onUpdateProgress(unitKey, { completed: false });
    } else {
      if (!canComplete) return;
      setIsTimerRunning(false);
      onCompleteUnit(unitKey, timerSeconds);
      playSound('complete', soundEnabled);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Status computation
  let statusBadgeVariant: 'mint' | 'cream' | 'neutral' = 'neutral';
  let statusText = 'PENDING';
  if (isCompleted) {
    statusBadgeVariant = 'mint';
    statusText = 'COMPLETED';
  } else if (isTimerRunning || timerSeconds > 0 || notesOpen) {
    statusBadgeVariant = 'cream';
    statusText = 'IN PROGRESS';
  }

  // Card color accent by skill
  let cardAccent = 'border-black';
  let badgeSkillVariant: 'rose' | 'mint' | 'lavender' | 'indigo' = 'mint';
  if (isGrammar) {
    badgeSkillVariant = 'rose';
  } else if (isVocabOrPhrase) {
    badgeSkillVariant = slot.skill.includes('Advanced') ? 'mint' : 'lavender';
  } else if (isPronunciation) {
    badgeSkillVariant = 'indigo';
  }

  return (
    <article
      className={`bg-[#FFFDF5] border-2 ${cardAccent} rounded-3xl p-5 neo-shadow transition-all mb-4 ${
        isCompleted ? 'bg-[#FFFDF5]/80' : ''
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5 rounded-md">
            MISSION #{missionNumber}
          </span>
          <Badge variant={badgeSkillVariant} size="md">
            {slot.bookId} • Unit {slot.unit}
          </Badge>
          <Badge variant="neutral" size="sm">
            Slot {slot.slotNumber}: {slot.focusArea}
          </Badge>
          <Badge variant="indigo" size="sm">
            {slot.targetLevel}
          </Badge>
        </div>

        {/* Stopwatch & Status Pill */}
        <div className="flex items-center gap-2">
          {/* Inline Stopwatch */}
          <div className="flex items-center gap-1.5 bg-black/5 px-2.5 py-1 rounded-xl border border-black/10">
            <Clock className="w-3.5 h-3.5 text-black/60" />
            <span className="font-mono text-xs font-bold text-black">{formatTimer(timerSeconds)}</span>
            {!isTimerRunning ? (
              <button
                onClick={() => setIsTimerRunning(true)}
                title="Start Unit Timer"
                aria-label="Start Unit Timer"
                className="p-1 rounded bg-white hover:bg-[#C8E6C9] border border-black/20 cursor-pointer text-black"
              >
                <Play className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => setIsTimerRunning(false)}
                title="Pause Unit Timer"
                aria-label="Pause Unit Timer"
                className="p-1 rounded bg-[#FFF3C4] hover:bg-amber-200 border border-black/20 cursor-pointer text-black"
              >
                <Pause className="w-3 h-3" />
              </button>
            )}
          </div>

          <Badge variant={statusBadgeVariant}>{statusText}</Badge>

          <button
            onClick={() => onInspectUnit(slot.bookId, slot.unit)}
            className="text-xs font-mono text-black/60 hover:text-black underline cursor-pointer"
          >
            Inspect Unit ↗
          </button>
        </div>
      </div>

      {/* Title & Book Info */}
      <div className="py-3">
        <h3 className="text-base sm:text-lg font-bold text-black flex items-center gap-2">
          <span>{slot.title}</span>
        </h3>
        <p className="text-xs font-mono text-black/60 mt-0.5">
          Source: <span className="text-black font-semibold">{slot.bookTitle}</span>
        </p>
      </div>

      {/* Mandatory Sub-Gates Container */}
      <div className="mt-2 bg-black/2.5 border border-black/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#312E81]" />
            Deliberate Practice Sub-Gates
          </span>
          <span className="text-[11px] font-mono text-black/60">Required for verification</span>
        </div>

        {/* 1. Grammar Sub-Gates */}
        {isGrammar && (
          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={solvedRightPage}
                onChange={(e) => handleGrammarCheck(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-2 border-black accent-[#312E81] cursor-pointer"
              />
              <span className="text-xs text-black font-medium">
                Solved the right-page textbook drills & self-checked answers against key.
              </span>
            </label>

            <div>
              <div className="text-xs font-semibold text-black mb-1.5 flex items-center justify-between">
                <span>3 Personalized Sentences (Target Structure):</span>
                <span className="text-[11px] font-mono text-black/50">Production Gate</span>
              </div>
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Sentence 1: e.g. I have been working on this project since January."
                  value={sent1}
                  onChange={(e) => handleSentencesUpdate(e.target.value, sent2, sent3)}
                  className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                />
                <input
                  type="text"
                  placeholder="Sentence 2: e.g. She might not attend the conference tomorrow."
                  value={sent2}
                  onChange={(e) => handleSentencesUpdate(sent1, e.target.value, sent3)}
                  className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                />
                <input
                  type="text"
                  placeholder="Sentence 3: e.g. If I had known about the deadline, I would have submitted earlier."
                  value={sent3}
                  onChange={(e) => handleSentencesUpdate(sent1, sent2, e.target.value)}
                  className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Vocabulary & Phraseology Sub-Gates */}
        {isVocabOrPhrase && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-black">
                  Cloze Extraction Parser (with brackets [target] & Persian hint):
                </label>
                <span className="text-[11px] font-mono text-black/50">SM-2 Bridge</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. We must [abide by] (پیروی کردن از) the safety protocols."
                  value={clozeExtraction}
                  onChange={(e) => handleClozeExtractionChange(e.target.value)}
                  className="flex-1 bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                />
                <Button
                  variant="cream"
                  size="sm"
                  icon={<Layers className="w-3.5 h-3.5" />}
                  onClick={handleAddClozeToFlashcards}
                  disabled={!clozeExtraction.trim()}
                >
                  Add to Flashcards
                </Button>
              </div>

              {clozeNotification && (
                <div className="mt-1.5 text-xs font-mono text-emerald-800 bg-[#C8E6C9] px-2.5 py-1 rounded-lg border border-black/15 animate-in fade-in">
                  ✅ {clozeNotification}
                </div>
              )}
            </div>

            {/* 2-Minute Mental Scenario */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scenarioDone}
                  onChange={(e) => {
                    setScenarioDone(e.target.checked);
                    onUpdateProgress(unitKey, { scenarioDone: e.target.checked });
                  }}
                  className="w-4 h-4 rounded border-2 border-black accent-[#312E81] cursor-pointer"
                />
                <span className="text-xs text-black font-medium">
                  Mentally generated a real-world scenario using 3 new expressions.
                </span>
              </label>

              {scenarioTimer === null ? (
                <button
                  onClick={() => setScenarioTimer(120)}
                  className="px-2.5 py-1 rounded-lg border border-black bg-white hover:bg-[#FFF3C4] text-[11px] font-mono font-semibold text-black flex items-center gap-1 cursor-pointer"
                >
                  <Timer className="w-3 h-3" />
                  Start 2m Mental Timer
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-[#FFF3C4] border border-black text-[11px] font-mono font-bold text-black animate-pulse">
                  Mental Timer: {scenarioTimer}s
                </span>
              )}
            </div>
          </div>
        )}

        {/* 3. Pronunciation (AAT) Sub-Gates */}
        {isPronunciation && (
          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={shadowingDone}
                onChange={(e) => {
                  setShadowingDone(e.target.checked);
                  onUpdateProgress(unitKey, { shadowingDone: e.target.checked });
                }}
                className="mt-0.5 w-4 h-4 rounded border-2 border-black accent-[#312E81] cursor-pointer"
              />
              <span className="text-xs text-black font-medium">
                Completed 3 active shadowing passes with pitch tracking and stair-step intonation.
              </span>
            </label>

            <div>
              <label className="text-xs font-semibold text-black mb-1 block">
                Acoustic Linking & Reduction Notes:
              </label>
              <input
                type="text"
                placeholder="e.g. /t/ voiced to flap tap in 'better', cat/caught vowel contrast"
                value={linkingNotes}
                onChange={(e) => {
                  setLinkingNotes(e.target.value);
                  onUpdateProgress(unitKey, { linkingNotes: e.target.value });
                }}
                className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
              />
            </div>
          </div>
        )}
      </div>

      {/* Unit Key Notes & Mnemonic Exceptions (Collapsible) */}
      <div className="mt-3">
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="flex items-center justify-between w-full text-xs font-mono font-semibold text-black/70 hover:text-black py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-black" />
            <span>Unit Key Notes & Mnemonic Exceptions</span>
            {keyNotes && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
          </span>
          {notesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {notesOpen && (
          <div className="mt-2 animate-in fade-in duration-150">
            <textarea
              rows={2}
              dir="auto"
              value={keyNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Record structural rules, irregular patterns, or Persian mnemonics (e.g. تفاوت در کاربرد حروف اضافه)..."
              className="w-full bg-black/2.5 font-vazir border border-black/15 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black resize-y leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-4 pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-mono text-black/70">
          {!canComplete && !isCompleted && (
            <span className="text-amber-800 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Gate: {missingRequirement}</span>
            </span>
          )}
          {canComplete && !isCompleted && (
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Sub-gates satisfied. Ready to complete!
            </span>
          )}
          {isCompleted && (
            <span className="text-emerald-900 font-bold flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-700" /> Unit verified and logged.
            </span>
          )}
        </div>

        <Button
          variant={isCompleted ? 'primary' : 'mint'}
          size="md"
          disabled={!canComplete && !isCompleted}
          icon={isCompleted ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          onClick={handleCompleteToggle}
        >
          {isCompleted ? 'Completed (Click to Reopen)' : 'Mark Unit Completed'}
        </Button>
      </div>
    </article>
  );
};
