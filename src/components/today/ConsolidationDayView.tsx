import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  AlertOctagon,
  Mic,
  Play,
  Pause,
  Download,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import { AppState } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { playSound } from '../../services/audio';
import { downloadFile } from '../../services/storage';
import { getTodayDateString } from '../../utils/date';

interface ConsolidationDayViewProps {
  dayNumber: number;
  weekNumber: number;
  phase: number;
  state: AppState;
  onOpenReviewModal: () => void;
  onNavigateToMistakes: () => void;
  onUpdateConsolidation: (weekNumber: number, updates: { flashcardsCleared?: boolean; mistakesReviewed?: boolean; shadowingDone?: boolean; shadowingSeconds?: number; completed?: boolean }) => void;
}

export const ConsolidationDayView: React.FC<ConsolidationDayViewProps> = ({
  dayNumber,
  weekNumber,
  phase,
  state,
  onOpenReviewModal,
  onNavigateToMistakes,
  onUpdateConsolidation,
}) => {
  const rawRecord = state.consolidationRecords?.[weekNumber];
  const weekRecord = {
    flashcardsCleared: Boolean(rawRecord?.flashcardsCleared),
    mistakesReviewed: Boolean(rawRecord?.mistakesReviewed),
    shadowingDone: Boolean(rawRecord?.shadowingDone),
    shadowingSeconds: Number(rawRecord?.shadowingSeconds || 0),
    completed: Boolean(rawRecord?.completed),
  };

  // Due flashcards count
  const todayStr = getTodayDateString();
  const dueCount = state.flashcards.filter((c) => !c.dueDate || c.dueDate <= todayStr).length;
  const unresolvedMistakesCount = state.mistakes.filter((m) => m.status === 'unresolved').length;

  // Shadowing timer for 20m consolidation
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [shadowingSeconds, setShadowingSeconds] = useState(weekRecord.shadowingSeconds || 0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setShadowingSeconds((prev) => {
          const next = prev + 1;
          if (next >= 1200 && !weekRecord.shadowingDone) {
            // 20 minutes hit!
            onUpdateConsolidation(weekNumber, { shadowingDone: true, shadowingSeconds: next });
            playSound('complete', state.settings.soundEnabled);
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, weekNumber, weekRecord.shadowingDone, onUpdateConsolidation, state.settings.soundEnabled]);

  const handleToggleStep1 = () => {
    onUpdateConsolidation(weekNumber, { flashcardsCleared: !weekRecord.flashcardsCleared });
  };

  const handleToggleStep2 = () => {
    onUpdateConsolidation(weekNumber, { mistakesReviewed: !weekRecord.mistakesReviewed });
  };

  const handleToggleStep3 = () => {
    onUpdateConsolidation(weekNumber, { shadowingDone: !weekRecord.shadowingDone, shadowingSeconds });
  };

  const allThreeCleared =
    (weekRecord.flashcardsCleared || dueCount === 0) &&
    (weekRecord.mistakesReviewed || unresolvedMistakesCount === 0) &&
    (weekRecord.shadowingDone || shadowingSeconds >= 1200);

  const handleCompleteConsolidation = () => {
    onUpdateConsolidation(weekNumber, {
      completed: true,
      flashcardsCleared: true,
      mistakesReviewed: true,
      shadowingDone: true,
      shadowingSeconds,
    });
    playSound('complete', state.settings.soundEnabled);
  };

  // Export Weekly Markdown Cheatsheet
  const handleExportCheatsheet = () => {
    const lines: string[] = [];
    lines.push(`# StudyOS Weekly Synthesis Cheatsheet — Week ${weekNumber} (Phase ${phase})`);
    lines.push(`Generated: ${new Date().toLocaleDateString('en-US')} | Target: A1 → B2/C1 Deliberate Practice`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 1. Key Unit Notes & Mnemonic Exceptions');

    let notesFound = 0;
    Object.entries(state.unitProgress).forEach(([key, prog]) => {
      if (prog.keyNotes?.trim()) {
        lines.push(`### Unit ${key.replace('_', ' ')}`);
        lines.push(`- **Notes:** ${prog.keyNotes}`);
        if (prog.sentences && prog.sentences.length > 0) {
          lines.push(`- **Production Sentences:**`);
          prog.sentences.forEach((s) => s && lines.push(`  - ${s}`));
        }
        if (prog.extractedCloze) {
          lines.push(`- **Cloze Deletion Target:** ${prog.extractedCloze}`);
        }
        lines.push('');
        notesFound++;
      }
    });

    if (notesFound === 0) {
      lines.push('_No unit notes logged this week yet._\n');
    }

    lines.push('## 2. Active Mistake Vault & Corrections');
    state.mistakes.forEach((m, idx) => {
      lines.push(`${idx + 1}. **[${m.category}]**`);
      lines.push(`   - ❌ *Error:* ${m.error}`);
      lines.push(`   - ✅ *Correction:* ${m.correction}`);
      lines.push(`   - 💡 *Rule:* ${m.rule}`);
      if (m.persianNote) {
        lines.push(`   - 🇮🇷 *Persian Clue:* ${m.persianNote}`);
      }
      lines.push('');
    });

    lines.push('## 3. Lexicon Vocabulary Snapshot');
    state.lexicon.forEach((word) => {
      lines.push(`- **${word.word}** (${word.level} • *${word.partOfSpeech}* ${word.phonetic})`);
      lines.push(`  - *Definition:* ${word.definition}`);
      lines.push(`  - *Persian:* ${word.persian}`);
      lines.push(`  - *Example:* "${word.example}"`);
      if (word.collocations && word.collocations.length > 0) {
        lines.push(`  - *Collocations:* ${word.collocations.join(' | ')}`);
      }
      lines.push('');
    });

    lines.push('---');
    lines.push('_Deliberate Practice • Zero Gamification • StudyOS English Learning Engine_');

    const content = lines.join('\n');
    downloadFile(`StudyOS-Cheatsheet-Week${weekNumber}.md`, content, 'text/markdown');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#D1C4E9]/30 border-2 border-black rounded-3xl p-6 neo-shadow">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/15">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="lavender" size="md">
              WEEK {weekNumber} CONSOLIDATION WIZARD
            </Badge>
            <Badge variant="indigo" size="sm">
              Day {dayNumber} (Clearance & Buffer)
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-black mt-1">
            Zero New Lessons • 3-Step Systematic Clearance
          </h2>
          <p className="text-xs text-black/70 mt-0.5">
            Buffer day engineered for memory reconsolidation, error elimination, and oral synthesis.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExportCheatsheet}
        >
          Export Weekly Cheatsheet (.md)
        </Button>
      </div>

      {/* 3 Interactive Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Step 1: Flashcard Backlog */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 neo-shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-black uppercase">
                Step 1: Spaced Repetition
              </span>
              <Layers className="w-4 h-4 text-[#312E81]" />
            </div>
            <h3 className="text-sm font-bold text-black mb-1">Clear Flashcard Backlog</h3>
            <p className="text-xs text-black/70 mb-3">
              Review all due cloze deletion cards to maintain memory strength and prevent drift.
            </p>

            <div className="bg-black/5 rounded-xl p-2.5 mb-3 text-center">
              <span className="text-2xl font-mono font-bold text-black">
                {dueCount} Due Cards
              </span>
              <div className="text-[11px] font-mono text-black/60 mt-0.5">
                {dueCount === 0 ? '✅ Zero Backlog!' : 'Active review required'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="cream"
              size="sm"
              className="w-full"
              onClick={onOpenReviewModal}
              disabled={dueCount === 0}
            >
              Start Review Session
            </Button>

            <label className="flex items-center gap-2 text-xs font-medium text-black cursor-pointer select-none">
              <input
                type="checkbox"
                checked={weekRecord.flashcardsCleared || dueCount === 0}
                onChange={handleToggleStep1}
                className="w-4 h-4 rounded border-2 border-black accent-[#312E81] cursor-pointer"
              />
              <span>Backlog verified cleared</span>
            </label>
          </div>
        </div>

        {/* Step 2: Mistake Vault Clearance */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 neo-shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-black uppercase">
                Step 2: Error Reconstruction
              </span>
              <AlertOctagon className="w-4 h-4 text-[#FF2A5F]" />
            </div>
            <h3 className="text-sm font-bold text-black mb-1">Review Mistake Vault</h3>
            <p className="text-xs text-black/70 mb-3">
              Review unresolved syntax and collocation slips. Bridge critical errors to FSRS cards.
            </p>

            <div className="bg-black/5 rounded-xl p-2.5 mb-3 text-center">
              <span className="text-2xl font-mono font-bold text-black">
                {unresolvedMistakesCount} Unresolved
              </span>
              <div className="text-[11px] font-mono text-black/60 mt-0.5">
                {unresolvedMistakesCount === 0 ? '✅ All mastered' : 'Needs attention'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="rose"
              size="sm"
              className="w-full"
              onClick={onNavigateToMistakes}
            >
              Open Mistake Vault
            </Button>

            <label className="flex items-center gap-2 text-xs font-medium text-black cursor-pointer select-none">
              <input
                type="checkbox"
                checked={weekRecord.mistakesReviewed || unresolvedMistakesCount === 0}
                onChange={handleToggleStep2}
                className="w-4 h-4 rounded border-2 border-black accent-[#312E81] cursor-pointer"
              />
              <span>Mistakes analyzed & corrected</span>
            </label>
          </div>
        </div>

        {/* Step 3: Cumulative 20m Shadowing */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 neo-shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-black uppercase">
                Step 3: Oral Production
              </span>
              <Mic className="w-4 h-4 text-[#312E81]" />
            </div>
            <h3 className="text-sm font-bold text-black mb-1">20m Cumulative Shadowing</h3>
            <p className="text-xs text-black/70 mb-3">
              Continuous shadowing session consolidating phonetic flow and spontaneous rhythm.
            </p>

            <div className="bg-black/5 rounded-xl p-2.5 mb-3 text-center">
              <span className="text-2xl font-mono font-bold text-black">
                {formatTime(shadowingSeconds)} / 20:00
              </span>
              <div className="text-[11px] font-mono text-black/60 mt-0.5">
                {shadowingSeconds >= 1200 ? '✅ 20 Minutes Target Reached' : 'Active shadowing timer'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              {!isTimerRunning ? (
                <Button
                  variant="mint"
                  size="sm"
                  className="flex-1"
                  icon={<Play className="w-3.5 h-3.5" />}
                  onClick={() => setIsTimerRunning(true)}
                >
                  Start Timer
                </Button>
              ) : (
                <Button
                  variant="cream"
                  size="sm"
                  className="flex-1"
                  icon={<Pause className="w-3.5 h-3.5" />}
                  onClick={() => setIsTimerRunning(false)}
                >
                  Pause
                </Button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-black cursor-pointer select-none">
              <input
                type="checkbox"
                checked={weekRecord.shadowingDone || shadowingSeconds >= 1200}
                onChange={handleToggleStep3}
                className="w-4 h-4 rounded border-2 border-black accent-[#312E81] cursor-pointer"
              />
              <span>20-minute session logged</span>
            </label>
          </div>
        </div>
      </div>

      {/* Complete Consolidation Day Button */}
      <div className="mt-6 pt-4 border-t border-black/15 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-mono text-black/70">
          {weekRecord.completed ? (
            <span className="text-emerald-900 font-bold flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              Week {weekNumber} Consolidation successfully completed and locked!
            </span>
          ) : (
            <span>Complete all 3 steps to finish Day {dayNumber} consolidation.</span>
          )}
        </div>

        <Button
          variant={weekRecord.completed ? 'primary' : 'mint'}
          size="lg"
          disabled={!allThreeCleared && !weekRecord.completed}
          icon={<CheckCircle2 className="w-5 h-5" />}
          onClick={handleCompleteConsolidation}
        >
          {weekRecord.completed ? 'Consolidation Verified ✅' : 'Complete Week Consolidation'}
        </Button>
      </div>
    </div>
  );
};
