import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
  CheckCircle2,
  Circle,
  BookOpen,
  Check,
  RotateCcw,
  Play,
  Pause,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppState, ScheduledSlot, UnitProgress, Flashcard } from '../../types';
import { getPlanForDay, TOTAL_DAYS } from '../../services/scheduler';
import { playSound } from '../../services/audio';
import { showToast } from '../../services/notification';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { OutputRitual } from './OutputRitual';
import { ConsolidationDayView } from './ConsolidationDayView';
import { getTodayDateString } from '../../utils/date';

export interface TodayViewProps {
  state: AppState;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onShiftSchedule: () => void;
  onUnshiftSchedule: () => void;
  onNavigateToStudio: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToMistakes?: () => void;
  onOpenReviewModal: () => void;
  onUpdateUnitProgress: (unitKey: string, updates: Partial<UnitProgress>) => void;
  onCompleteUnit: (unitKey: string, timeSpent: number) => void;
  onAddFlashcard: (card: Flashcard) => void;
  onInspectUnit: (bookId: string, unit: string) => void;
  onCommitShadowingSession: (day: number, seconds: number) => void;
  onSaveDailySprint: (day: number, text: string) => void;
  onUpdateConsolidation: (weekNumber: number, data: any) => void;
}

function triggerNativeConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#312E81', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#3B82F6'];
  const particles: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    vx: number;
    vy: number;
    rotation: number;
    vRot: number;
  }> = [];

  for (let i = 0; i < 110; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 280,
      y: canvas.height * 0.45,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 20,
      vy: Math.random() * -14 - 5,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
    });
  }

  const startTime = Date.now();
  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45;
      p.rotation += p.vRot;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    if (Date.now() - startTime < 3400) {
      requestAnimationFrame(render);
    } else {
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  }
  requestAnimationFrame(render);
}

function parseClozeSentence(rawText: string, fallbackTarget: string) {
  let text = rawText.trim();
  let persianHint = '';
  let targetPhrase = '';

  const hintMatch = text.match(/\(([^)]+)\)\s*$/);
  if (hintMatch) {
    persianHint = hintMatch[1].trim();
    text = text.replace(/\(([^)]+)\)\s*$/, '').trim();
  }

  const bracketMatch = text.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    const extracted = bracketMatch[1].trim();
    if (extracted !== '...' && extracted !== '…') {
      targetPhrase = extracted;
    } else {
      targetPhrase = fallbackTarget;
    }
    text = text.replace(/\[([^\]]+)\]/, '[ ... ]');
  } else {
    targetPhrase = fallbackTarget;
  }

  return {
    prompt: text,
    targetPhrase: targetPhrase || fallbackTarget,
    persianHint,
  };
}

interface CompactMissionRowProps {
  slot: ScheduledSlot;
  index: number;
  progress: UnitProgress;
  onCompleteUnit: (unitKey: string, timeSpent: number) => void;
  onUpdateProgress: (unitKey: string, updates: Partial<UnitProgress>) => void;
  onInspectUnit: (bookId: string, unit: string) => void;
  onAddFlashcard: (card: Flashcard) => void;
  soundEnabled: boolean;
}

const CompactMissionRow: React.FC<CompactMissionRowProps> = ({
  slot,
  index,
  progress,
  onCompleteUnit,
  onUpdateProgress,
  onInspectUnit,
  onAddFlashcard,
  soundEnabled,
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(progress.keyNotes || '');
  const [showPracticeDrawer, setShowPracticeDrawer] = useState(false);

  const initialClozeList = progress.extractedClozeList && progress.extractedClozeList.length > 0
    ? progress.extractedClozeList
    : (progress.extractedCloze ? [progress.extractedCloze] : ['']);

  const [clozeList, setClozeList] = useState<string[]>(initialClozeList);

  const unitKey = `${slot.bookId}_${slot.unit}`;
  const isDone = Boolean(progress.completed);

  const onUpdateProgressRef = useRef(onUpdateProgress);
  onUpdateProgressRef.current = onUpdateProgress;

  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(progress.timeSpentSeconds || 0);
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  // تغییر اسلات یا روز: بازنشانی فقط با تغییر unitKey
  useEffect(() => {
    setIsRunning(false);
    const initialSec = progress.timeSpentSeconds || 0;
    setSeconds(initialSec);
    secondsRef.current = initialSec;
    setNoteText(progress.keyNotes || '');
    setClozeList(
      progress.extractedClozeList && progress.extractedClozeList.length > 0
        ? progress.extractedClozeList
        : (progress.extractedCloze ? [progress.extractedCloze] : [''])
    );
  }, [unitKey]);

  // چرخه اجرای تایمر - فقط وابسته به isRunning و unitKey
  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      const next = secondsRef.current + 1;
      secondsRef.current = next;
      setSeconds(next);
      if (next % 10 === 0) {
        onUpdateProgressRef.current(unitKey, { timeSpentSeconds: next });
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning, unitKey]);

  // ذخیره زمان سپری‌شده در هنگام unmount
  useEffect(() => {
    return () => {
      if (secondsRef.current > 0) {
        onUpdateProgressRef.current(unitKey, { timeSpentSeconds: secondsRef.current });
      }
    };
  }, [unitKey]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      setIsRunning(false);
      onUpdateProgressRef.current(unitKey, { timeSpentSeconds: secondsRef.current });
    } else {
      setIsRunning(true);
    }
  };

  const handleResetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(false);
    setSeconds(0);
    secondsRef.current = 0;
    onUpdateProgressRef.current(unitKey, { timeSpentSeconds: 0 });
  };

  const handleToggleComplete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isDone) {
      onUpdateProgress(unitKey, { completed: false });
    } else {
      if (isRunning) setIsRunning(false);
      onCompleteUnit(unitKey, seconds || 900);
      playSound('complete', soundEnabled);
    }
  };

  const handleSaveNotes = () => {
    onUpdateProgress(unitKey, { keyNotes: noteText });
    setShowNotes(false);
  };

  const getBadgeStyle = (bookId: string) => {
    if (bookId === 'BGIU' || bookId === 'EGIU') return 'bg-[#FFCDD2] text-[#B71C1C] border-black/20';
    if (bookId.startsWith('OWS')) return 'bg-[#C8E6C9] text-[#1B5E20] border-black/20';
    if (bookId.startsWith('COLL') || bookId.startsWith('PV')) return 'bg-[#D1C4E9] text-[#4A148C] border-black/20';
    if (bookId === 'AAT') return 'bg-[#E0E7FF] text-[#1E1B4B] border-black/20';
    return 'bg-neutral-100 text-neutral-800 border-black/20';
  };

  return (
    <div
      className={`border-2 border-black rounded-2xl transition-all duration-200 bg-white ${
        isDone ? 'bg-[#F9FBF9] border-black/40 opacity-90' : 'neo-shadow-sm hover:translate-x-0.5'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:px-4">
        {/* ردیف بالا: تیک، شماره تسک، برچسب منبع و عنوان */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleToggleComplete}
            aria-label={isDone ? 'Mark as pending' : 'Mark as complete'}
            className={`w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 ${
              isDone ? 'bg-[#4ADE80] text-black shadow-[1px_1px_0px_0px_#000]' : 'bg-white hover:bg-neutral-100'
            }`}
          >
            {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-4 h-4 text-black/20" />}
          </button>

          <span className="font-mono text-xs font-black text-black/70 shrink-0">
            #{index + 1}
          </span>

          <span
            className={`text-[10px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0 ${getBadgeStyle(
              slot.bookId
            )}`}
          >
            {slot.bookId} • U{slot.unit}
          </span>

          <span
            className={`text-xs sm:text-[13px] font-bold text-black truncate ${
              isDone ? 'line-through text-black/50' : ''
            }`}
            title={slot.title}
          >
            {slot.title}
          </span>
        </div>

        {/* ردیف پایین در موبایل: تایمر در چپ و دسته ابزارها در راست / در دسکتاپ تک‌سطری بدون تغییر */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/10">
          <div className="h-8 sm:h-auto flex items-center bg-white sm:bg-black/5 rounded-xl border-2 sm:border border-black sm:border-black/20 shadow-[1px_1px_0px_0px_#000] sm:shadow-none p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={handleToggleTimer}
              className={`h-full sm:h-auto px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                isRunning ? 'bg-[#FFCDD2] text-rose-950 animate-pulse' : 'hover:bg-white text-black/80'
              }`}
              title={isRunning ? 'Pause Timer' : 'Start Timer'}
            >
              {isRunning ? <Pause className="w-3 h-3 shrink-0" /> : <Play className="w-3 h-3 shrink-0" />}
              <span>{formatTimer(seconds)}</span>
            </button>

            {seconds > 0 && (
              <button
                type="button"
                onClick={handleResetTimer}
                className="p-1.5 text-black/60 hover:text-black hover:bg-white rounded cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                title="Reset Timer to 00:00"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`h-8 px-2.5 sm:px-2 rounded-xl border-2 border-black font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-[1px_1px_0px_0px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 ${
                progress.keyNotes || showNotes
                  ? 'bg-[#FFF3C4] text-amber-950'
                  : 'bg-white hover:bg-black/5 text-black/70'
              }`}
              title="Lesson Key Notes"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Note</span>
              {progress.keyNotes && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => onInspectUnit(slot.bookId, slot.unit)}
              className="h-8 w-8 sm:h-auto sm:w-auto p-0 sm:p-1.5 rounded-xl border-2 sm:border border-black sm:border-black/20 hover:border-black hover:bg-[#E0E7FF] text-[#312E81] bg-white sm:bg-transparent shadow-[1px_1px_0px_0px_#000] sm:shadow-none active:translate-x-0.5 active:translate-y-0.5 sm:active:translate-x-0 sm:active:translate-y-0 transition-all flex items-center justify-center cursor-pointer"
              title="Inspect Unit Material"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowPracticeDrawer(!showPracticeDrawer)}
              className="h-8 w-8 sm:h-auto sm:w-auto p-0 sm:p-1.5 rounded-xl border-2 sm:border border-black sm:border-black/20 hover:border-black hover:bg-black/5 text-black/60 bg-white sm:bg-transparent shadow-[1px_1px_0px_0px_#000] sm:shadow-none active:translate-x-0.5 active:translate-y-0.5 sm:active:translate-x-0 sm:active:translate-y-0 transition-all flex items-center justify-center cursor-pointer"
              title="Toggle Exercises"
            >
              {showPracticeDrawer ? (
                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {showNotes && (
        <div className="px-3 sm:px-4 pb-3.5 pt-1.5 border-t border-black/10 bg-[#FFFDF5] rounded-b-2xl animate-in fade-in duration-150 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-black/60">
            <span>UNIT KEY NOTES & MNEMONICS</span>
            <span className="text-[10px] text-emerald-800 font-bold">Auto-saved</span>
          </div>
          <div className="relative">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write key collocations, mnemonic rules, or exceptions here..."
              rows={2}
              className="w-full text-xs font-mono p-2.5 pr-8 border-2 border-black/20 focus:border-black rounded-xl bg-white focus:outline-none"
            />
            {noteText && (
              <button
                type="button"
                onClick={() => setNoteText('')}
                className="absolute left-2.5 top-2.5 text-xs font-mono font-bold text-black/30 hover:text-black/70 p-0.5 cursor-pointer transition-colors"
                title="Clear note"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNotes(false)}
              className="text-xs px-3 py-1 rounded-lg border border-black/20 hover:bg-neutral-100 font-mono font-bold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveNotes}
              className="text-xs px-3.5 py-1 rounded-lg bg-black text-white hover:bg-black/80 font-mono font-bold shadow-[1px_1px_0px_0px_#000] cursor-pointer"
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {showPracticeDrawer && (
        <div className="px-3 sm:px-4 pb-4 pt-2 border-t border-black/10 bg-black/2.5 space-y-3 animate-in fade-in duration-150">
          {slot.skill === 'Grammar' && (
            <div className="space-y-2.5">
              <label className="flex items-start sm:items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(progress.solvedRightPageExercises)}
                  onChange={(e) =>
                    onUpdateProgress(unitKey, {
                      solvedRightPageExercises: e.target.checked,
                    })
                  }
                  className="w-4 h-4 mt-0.5 sm:mt-0 rounded border-2 border-black accent-[#312E81] cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-black leading-snug">
                  Solved textbook right-page drills & self-checked answers against key.
                </span>
              </label>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-mono font-bold text-black/60 uppercase block">
                  3 Personalized Sentences:
                </span>
                {[0, 1, 2].map((idx) => {
                  const sentenceVal = progress.sentences?.[idx] || '';
                  return (
                    <div key={idx} className="relative">
                      <input
                        type="text"
                        placeholder={`Sentence ${idx + 1}...`}
                        value={sentenceVal}
                        onChange={(e) => {
                          const current = [...(progress.sentences || ['', '', ''])] as [string, string, string];
                          current[idx] = e.target.value;
                          onUpdateProgress(unitKey, { sentences: current });
                        }}
                        className="w-full bg-white border border-black/20 focus:border-black rounded-xl pr-8 pl-3.5 py-1.5 text-xs text-black focus:outline-none"
                      />
                      {sentenceVal && (
                        <button
                          type="button"
                          onClick={() => {
                            const current = [...(progress.sentences || ['', '', ''])] as [string, string, string];
                            current[idx] = '';
                            onUpdateProgress(unitKey, { sentences: current });
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-black/30 hover:text-black/70 p-0.5 cursor-pointer transition-colors"
                          title="Clear sentence"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {slot.skill !== 'Grammar' && slot.skill !== 'Speaking & Pronunciation' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-black/60 uppercase">
                <span>Extracted Cloze Flashcards ({clozeList.length}):</span>
              </div>

              {clozeList.map((clozeText, cIdx) => {
                const canRemove = clozeList.length > 1;

                return (
                  <div key={cIdx} className="flex gap-1.5 sm:gap-2 items-center">
                    <button
                      type="button"
                      disabled={!canRemove}
                      onClick={() => {
                        if (canRemove) {
                          const next = clozeList.filter((_, i) => i !== cIdx);
                          setClozeList(next);
                          onUpdateProgress(unitKey, {
                            extractedClozeList: next,
                            extractedCloze: next[0] || '',
                          });
                        }
                      }}
                      className={`w-5 h-8 flex items-center justify-center text-lg font-mono font-bold select-none shrink-0 transition-colors ${
                        canRemove
                          ? 'text-black/30 hover:text-rose-600 cursor-pointer'
                          : 'text-black/15 cursor-default'
                      }`}
                      title={canRemove ? 'Remove this row' : undefined}
                    >
                      −
                    </button>

                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="Format: The team had to [abandon] the site. (hint)"
                        value={clozeText}
                        onChange={(e) => {
                          const next = [...clozeList];
                          next[cIdx] = e.target.value;
                          setClozeList(next);
                          onUpdateProgress(unitKey, {
                            extractedClozeList: next,
                            extractedCloze: next[0] || '',
                          });
                        }}
                        className="w-full bg-white border border-black/20 focus:border-black rounded-xl pl-3 pr-8 py-2 text-xs text-black placeholder:text-black/35 focus:outline-none font-sans"
                      />
                      {clozeText && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...clozeList];
                            next[cIdx] = '';
                            setClozeList(next);
                            onUpdateProgress(unitKey, {
                              extractedClozeList: next,
                              extractedCloze: next[0] || '',
                            });
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-black/30 hover:text-black/70 p-0.5 cursor-pointer transition-colors"
                          title="Clear text"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!clozeText.trim()) {
                          showToast('Please enter a sentence matching the required format.', 'warning');
                          return;
                        }

                        const parsed = parseClozeSentence(clozeText, slot.title);

                        const newCard: Flashcard = {
                          id: `card-${slot.bookId}-${slot.unit}-${cIdx}-${Date.now().toString(36)}`,
                          prompt: parsed.prompt,
                          targetPhrase: parsed.targetPhrase,
                          persianHint: parsed.persianHint,
                          sourceBookId: slot.bookId,
                          sourceUnit: slot.unit,
                          interval: 1,
                          repetition: 0,
                          easeFactor: 2.5,
                          stability: 0,
                          difficulty: 0,
                          state: 0,
                          dueDate: getTodayDateString(),
                          lapses: 0,
                          skillTag: slot.skill,
                          createdAt: new Date().toISOString(),
                        };

                        onAddFlashcard(newCard);
                      }}
                      className="w-8 h-8 rounded-xl border-2 border-black bg-[#E0E7FF] hover:bg-[#C7D2FE] text-[#312E81] flex items-center justify-center cursor-pointer shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shrink-0 transition-all"
                      title="Convert to flashcard"
                    >
                      <Layers className="w-4 h-4 text-[#312E81]" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const next = [...clozeList, ''];
                  setClozeList(next);
                  onUpdateProgress(unitKey, {
                    extractedClozeList: next,
                    extractedCloze: next[0] || '',
                  });
                }}
                className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#312E81] hover:text-black cursor-pointer pt-1"
              >
                <span className="w-4 h-4 rounded-md border border-black flex items-center justify-center text-xs font-bold leading-none bg-white shadow-2xs">
                  +
                </span>
                <span>Add another cloze sentence</span>
              </button>
            </div>
          )}

          {slot.skill === 'Speaking & Pronunciation' && (
            <label className="flex items-start sm:items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(progress.shadowingDone)}
                onChange={(e) =>
                  onUpdateProgress(unitKey, { shadowingDone: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 sm:mt-0 rounded border-2 border-black accent-[#312E81] cursor-pointer shrink-0"
              />
              <span className="text-xs font-bold text-black leading-snug">
                Shadowed audio tracks with exaggerated intonation & linking.
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
};

export const TodayView: React.FC<TodayViewProps> = ({
  state,
  selectedDay,
  onSelectDay,
  onNavigateToStudio,
  onNavigateToAnalytics,
  onNavigateToMistakes,
  onOpenReviewModal,
  onUpdateUnitProgress,
  onCompleteUnit,
  onAddFlashcard,
  onInspectUnit,
  onCommitShadowingSession,
  onSaveDailySprint,
  onUpdateConsolidation,
}) => {
  const plan = getPlanForDay(selectedDay);
  const activeDay = state.settings.currentActiveDay;
  const isViewingActiveDay = selectedDay === activeDay;

  const persianDateStr = new Intl.DateTimeFormat('fa-IR', {
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const handleGoToAnalytics = () => {
    if (onNavigateToAnalytics) onNavigateToAnalytics();
    else onNavigateToStudio();
  };

  const todayStr = getTodayDateString();
  const dueCards = state.flashcards.filter((c) => !c.dueDate || c.dueDate <= todayStr);
  const dueCount = dueCards.length;

  const ritual = state.todayRitual[selectedDay] || {
    shadowingSeconds: 0,
    sprintCompleted: false,
    dailyFlashcardReviewedCount: 0,
    dailyFlashcardsGoalCleared: false,
  };
  const isFlashcardTaskCleared = dueCount === 0 || ritual.dailyFlashcardsGoalCleared;

  const totalMissionSlots = plan.slots.length;
  const completedMissionsCount = plan.slots.filter((s) => {
    const key = `${s.bookId}_${s.unit}`;
    return state.unitProgress[key]?.completed;
  }).length;

  const currentWeekDays = [1, 2, 3, 4, 5, 6].map((d) => (plan.weekNumber - 1) * 6 + d);

  let weekTotalUnits = 0;
  let weekCompletedUnits = 0;
  let weekGrammarTotal = 0, weekGrammarDone = 0;
  let weekVocabTotal = 0, weekVocabDone = 0;
  let weekPhraseTotal = 0, weekPhraseDone = 0;
  let weekAcousticTotal = 0, weekAcousticDone = 0;

  currentWeekDays.forEach((dayNum) => {
    if (dayNum <= TOTAL_DAYS) {
      const dayPlan = getPlanForDay(dayNum);
      dayPlan.slots.forEach((slot) => {
        weekTotalUnits++;
        const key = `${slot.bookId}_${slot.unit}`;
        const isDone = Boolean(state.unitProgress[key]?.completed);
        if (isDone) weekCompletedUnits++;

        if (slot.bookId === 'BGIU' || slot.bookId === 'EGIU') {
          weekGrammarTotal++;
          if (isDone) weekGrammarDone++;
        } else if (slot.bookId.startsWith('OWS')) {
          weekVocabTotal++;
          if (isDone) weekVocabDone++;
        } else if (slot.bookId.startsWith('COLL') || slot.bookId.startsWith('PV')) {
          weekPhraseTotal++;
          if (isDone) weekPhraseDone++;
        } else if (slot.bookId === 'AAT') {
          weekAcousticTotal++;
          if (isDone) weekAcousticDone++;
        }
      });
    }
  });

  const weekVelocityPct = weekTotalUnits > 0 ? Math.round((weekCompletedUnits / weekTotalUnits) * 100) : 0;

  const totalDailyGates = 3;
  let gatesDone = 0;
  if (isFlashcardTaskCleared) gatesDone++;
  if (totalMissionSlots > 0 && completedMissionsCount === totalMissionSlots) gatesDone++;
  if (ritual.sprintCompleted || ritual.shadowingSeconds > 0) gatesDone++;
  const dayProgressPct = Math.round((gatesDone / totalDailyGates) * 100);

  const prevProgressRef = useRef<number>(dayProgressPct);
  useEffect(() => {
    if (dayProgressPct === 100 && prevProgressRef.current < 100) {
      triggerNativeConfetti();
      playSound('complete', state.settings.soundEnabled);
    }
    prevProgressRef.current = dayProgressPct;
  }, [dayProgressPct, state.settings.soundEnabled]);

  const checkDayCompleted = (dNum: number) => {
    const dPlan = getPlanForDay(dNum);
    if (dPlan.isConsolidation) {
      return Boolean(state.consolidationRecords?.[dPlan.weekNumber]?.completed);
    }
    if (dPlan.slots.length === 0) return false;
    return dPlan.slots.every((s) => Boolean(state.unitProgress[`${s.bookId}_${s.unit}`]?.completed));
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 max-w-5xl mx-auto">
      <section className="bg-[#FFFDF5] border-2 border-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 neo-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-black/10">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <Badge variant="indigo" size="md">
                {plan.phaseLabel}
              </Badge>
              <Badge variant="coral" size="sm">
                Target: {plan.targetCefr}
              </Badge>
              <span
                dir="rtl"
                className="text-xs font-sans font-bold bg-[#E0E7FF] text-[#312E81] px-2.5 py-1 rounded-lg border border-black/15 shadow-2xs"
              >
                📅 {persianDateStr}
              </span>
              {dayProgressPct === 100 && (
                <button
                  type="button"
                  onClick={triggerNativeConfetti}
                  className="px-2.5 py-0.5 rounded-full bg-[#C8E6C9] border border-black text-emerald-950 font-mono text-xs font-bold flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform"
                  title="Click for celebration confetti!"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Day Cleared ✓</span>
                </button>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center gap-2">
              <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF2A5F] shrink-0" />
              <span>Day {selectedDay}</span>
              <span className="text-black/60 text-base sm:text-lg font-mono font-medium">/ {TOTAL_DAYS}</span>
            </h1>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onSelectDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay <= 1}
              aria-label="Previous Day"
              className="p-1.5 rounded-xl border-2 border-black bg-white hover:bg-[#FFF3C4] neo-shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all active:translate-x-0.5 active:translate-y-0.5 shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-black" />
            </button>

            <div className="w-20 flex justify-center shrink-0">
              <button
                type="button"
                disabled={isViewingActiveDay}
                onClick={() => onSelectDay(activeDay)}
                className={`w-full py-1.5 px-2 rounded-xl border-2 border-black font-mono text-[11px] font-bold transition-all shadow-[1px_1px_0px_0px_#000] flex items-center justify-center ${
                  isViewingActiveDay
                    ? 'bg-neutral-100 text-black/40 border-black/25 shadow-none cursor-default opacity-75'
                    : 'bg-[#FFF3C4] text-amber-950 hover:bg-[#FFE082] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer'
                }`}
                title={isViewingActiveDay ? "You are on today's active day" : "Jump back to today's active day"}
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSelectDay(Math.min(TOTAL_DAYS, selectedDay + 1))}
              disabled={selectedDay >= TOTAL_DAYS}
              aria-label="Next Day"
              className="p-1.5 rounded-xl border-2 border-black bg-white hover:bg-[#FFF3C4] neo-shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all active:translate-x-0.5 active:translate-y-0.5 shrink-0"
            >
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          <div className="lg:col-span-5 bg-white border-2 border-black rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 neo-shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span className="font-mono text-xs font-black uppercase tracking-wider text-black">
                  Today's Execution
                </span>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#C8E6C9] rounded-md border border-black/15 text-emerald-950">
                {dayProgressPct}% Ready
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center font-mono">
              <div
                className={`p-2 sm:p-2.5 rounded-xl border-2 transition-all ${
                  isFlashcardTaskCleared
                    ? 'bg-[#C8E6C9] border-black text-black font-bold shadow-[1px_1px_0px_0px_#000]'
                    : 'bg-neutral-50 border-black/20 text-black/60'
                }`}
              >
                <div className="text-[9px] sm:text-[10px] uppercase font-semibold">Task #0</div>
                <div className="text-[11px] sm:text-xs truncate">{isFlashcardTaskCleared ? 'Cleared ✓' : `${dueCount} Due`}</div>
              </div>

              <div
                className={`p-2 sm:p-2.5 rounded-xl border-2 transition-all ${
                  completedMissionsCount === totalMissionSlots && totalMissionSlots > 0
                    ? 'bg-[#C8E6C9] border-black text-black font-bold shadow-[1px_1px_0px_0px_#000]'
                    : 'bg-neutral-50 border-black/20 text-black/60'
                }`}
              >
                <div className="text-[9px] sm:text-[10px] uppercase font-semibold">Missions</div>
                <div className="text-[11px] sm:text-xs truncate">
                  {completedMissionsCount}/{totalMissionSlots} Done
                </div>
              </div>

              <div
                className={`p-2 sm:p-2.5 rounded-xl border-2 transition-all ${
                  ritual.shadowingSeconds > 0 || ritual.sprintCompleted
                    ? 'bg-[#C8E6C9] border-black text-black font-bold shadow-[1px_1px_0px_0px_#000]'
                    : 'bg-neutral-50 border-black/20 text-black/60'
                }`}
              >
                <div className="text-[9px] sm:text-[10px] uppercase font-semibold">Output</div>
                <div className="text-[11px] sm:text-xs truncate">
                  {ritual.sprintCompleted ? 'Logged ✓' : 'Pending'}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border-2 border-black rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 neo-shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black uppercase tracking-wider text-black">
                Week {plan.weekNumber} Cycle
              </span>
              <button
                type="button"
                onClick={handleGoToAnalytics}
                className="text-[#312E81] hover:underline text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>{weekVelocityPct}% Velocity</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
              {currentWeekDays.map((dNum, i) => {
                const isCurrentSelected = dNum === selectedDay;
                const isRealActive = dNum === activeDay;
                const isCompleted = checkDayCompleted(dNum);
                const isConsolidation = i === 5;

                return (
                  <button
                    key={dNum}
                    type="button"
                    onClick={() => onSelectDay(dNum)}
                    className={`py-1 sm:py-1.5 px-0.5 sm:px-1 rounded-xl border-2 font-mono text-center transition-all cursor-pointer ${
                      isCurrentSelected
                        ? 'border-black bg-[#FFF3C4] shadow-[1.5px_1.5px_0px_0px_#000] font-black scale-105 z-10'
                        : isRealActive
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-950 font-bold'
                        : isCompleted
                        ? 'border-black/30 bg-[#C8E6C9]'
                        : 'border-black/15 bg-neutral-50 hover:bg-neutral-100 text-black/60'
                    }`}
                  >
                    <div className="text-[9px] sm:text-[10px] leading-none text-black/70 font-semibold">D{i + 1}</div>
                    <div className="text-[11px] sm:text-xs font-bold leading-tight mt-0.5">
                      {isConsolidation ? 'Rev' : dNum}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1 pt-0.5">
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden flex border-2 border-black/20">
                <div
                  style={{ width: `${weekTotalUnits > 0 ? (weekGrammarDone / weekTotalUnits) * 100 : 0}%` }}
                  className="h-full bg-[#FFCDD2] transition-all"
                  title={`Grammar: ${weekGrammarDone}/${weekGrammarTotal}`}
                />
                <div
                  style={{ width: `${weekTotalUnits > 0 ? (weekVocabDone / weekTotalUnits) * 100 : 0}%` }}
                  className="h-full bg-[#C8E6C9] transition-all"
                  title={`Vocab: ${weekVocabDone}/${weekVocabTotal}`}
                />
                <div
                  style={{ width: `${weekTotalUnits > 0 ? (weekPhraseDone / weekTotalUnits) * 100 : 0}%` }}
                  className="h-full bg-[#D1C4E9] transition-all"
                  title={`Phraseology: ${weekPhraseDone}/${weekPhraseTotal}`}
                />
                <div
                  style={{ width: `${weekTotalUnits > 0 ? (weekAcousticDone / weekTotalUnits) * 100 : 0}%` }}
                  className="h-full bg-[#312E81] transition-all"
                  title={`Acoustic: ${weekAcousticDone}/${weekAcousticTotal}`}
                />
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between text-[10px] font-mono text-black/60 px-0.5 gap-x-2 gap-y-0.5">
                <span>Grammar ({weekGrammarDone}/{weekGrammarTotal})</span>
                <span>Vocab ({weekVocabDone}/{weekVocabTotal})</span>
                <span>Phrase ({weekPhraseDone}/{weekPhraseTotal})</span>
                <span>Accent ({weekAcousticDone}/{weekAcousticTotal})</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OutputRitual
        dayNumber={selectedDay}
        soundEnabled={state.settings.soundEnabled}
        vocalRestGuardEnabled={state.settings.vocalRestGuard}
        onCommitShadowingSession={onCommitShadowingSession}
        onSaveDailySprint={onSaveDailySprint}
        sprintAlreadyDone={ritual.sprintCompleted}
        loggedShadowingSeconds={ritual.shadowingSeconds}
      />

      {plan.isConsolidation ? (
        <ConsolidationDayView
          state={state}
          selectedDay={selectedDay}
          weekNumber={plan.weekNumber}
          onSelectDay={onSelectDay}
          onShiftSchedule={() => {}}
          onNavigateToStudio={onNavigateToStudio}
          onNavigateToMistakes={onNavigateToMistakes}
          onOpenReviewModal={onOpenReviewModal}
          onCommitShadowingSession={onCommitShadowingSession}
          onSaveDailySprint={onSaveDailySprint}
          onUpdateConsolidation={onUpdateConsolidation}
        />
      ) : (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-black text-black uppercase tracking-wider font-mono flex items-center gap-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span>Daily Mission Pipeline (Day {selectedDay})</span>
            </h2>
            <div className="text-xs font-mono font-bold text-black/70 shrink-0">
              {completedMissionsCount} / {totalMissionSlots} Completed
            </div>
          </div>

          <article className="bg-[#FFFDF5] border-2 border-black rounded-2xl sm:rounded-3xl p-4 sm:p-5 neo-shadow transition-all bg-gradient-to-r from-[#D1C4E9]/20 via-[#FFF3C4]/20 to-[#FFFDF5]">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-black/10">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-mono font-black text-[11px] sm:text-xs bg-[#FF2A5F] text-white px-2 sm:px-2.5 py-0.5 rounded-md">
                  TASK #0 • PRIORITY
                </span>
                <Badge variant="lavender" size="md">
                  FSRS Spaced Retrieval
                </Badge>
                <Badge variant="neutral" size="sm">
                  Overload Guard ({state.settings.dailyReviewCap}/day)
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={isFlashcardTaskCleared ? 'mint' : 'cream'}>
                  {isFlashcardTaskCleared ? 'All Cleared ✅' : 'Pending Review'}
                </Badge>
              </div>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-black flex items-center gap-2">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#312E81] shrink-0" />
                  <span>Daily Flashcard Clearance (Zero Backlog Rule)</span>
                </h3>
                <p className="text-xs text-black/70 mt-1 leading-relaxed max-w-xl">
                  {dueCount > 0
                    ? `You have ${dueCount} cards due for active retrieval. Complete this review before new textbook missions to ensure durable memory consolidation.`
                    : 'Congratulations! All due flashcards are cleared for today. Daily retention buffer is maintained.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <div className="w-full sm:w-auto">
                  <Button
                    variant={isFlashcardTaskCleared ? 'primary' : 'coral'}
                    size="lg"
                    icon={<Layers className="w-4 h-4" />}
                    onClick={onOpenReviewModal}
                  >
                    {isFlashcardTaskCleared ? 'Review Again' : `Start Daily Review (${dueCount} Due)`}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-black/10 text-[10px] sm:text-[11px] font-mono text-black/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>Overall Day completion is gated by Task #0.</span>
              <span className="font-semibold text-black">
                {state.flashcards.length} Master Cloze Cards in System
              </span>
            </div>
          </article>

          <div className="space-y-2.5">
            {plan.slots.map((slot: ScheduledSlot, idx: number) => {
              const unitKey = `${slot.bookId}_${slot.unit}`;
              const progress = state.unitProgress[unitKey] || {
                completed: false,
                timeSpentSeconds: 0,
                keyNotes: '',
              };

              return (
                <CompactMissionRow
                  key={`${slot.bookId}_${slot.unit}_${idx}`}
                  slot={slot}
                  index={idx}
                  progress={progress}
                  onCompleteUnit={onCompleteUnit}
                  onUpdateProgress={onUpdateUnitProgress}
                  onInspectUnit={onInspectUnit}
                  onAddFlashcard={onAddFlashcard}
                  soundEnabled={state.settings.soundEnabled}
                />
              );
            })}
          </div>

          {dayProgressPct === 100 && (
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#C8E6C9] border-2 border-black neo-shadow text-center animate-in zoom-in-95">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-black mx-auto mb-2" />
              <h3 className="text-lg sm:text-xl font-black text-black">
                Day {selectedDay} Complete & Verified!
              </h3>
              <p className="text-xs text-black/80 font-mono mt-1">
                All mandatory sub-gates, flashcards, and output sessions logged successfully.
              </p>
              {selectedDay < TOTAL_DAYS && (
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => onSelectDay(selectedDay + 1)}
                  >
                    Proceed to Day {selectedDay + 1} ↗
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default TodayView;