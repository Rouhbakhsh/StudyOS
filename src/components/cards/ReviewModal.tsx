import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Layers,
  Lightbulb,
  CheckCircle2,
  Volume2,
  Keyboard,
  Sparkles,
} from 'lucide-react';
import { Flashcard } from '../../types';
import { calculateFSRS, ReviewGrade, getDueCards } from '../../services/fsrs';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { playSound } from '../../services/audio';
import { playOfflineAudio } from '../../services/oxfordService';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Flashcard[];
  onUpdateCard: (updatedCard: Flashcard) => void;
  onReviewBatchComplete: (reviewedCount: number) => void;
  dailyCap: number;
  soundEnabled: boolean;
}

function renderGapSpans(text: string) {
  if (!text) return '';
  const parts = text.split(/(\[\s*(?:\.{3,}|…)\s*\])/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (/^\[\s*(?:\.{3,}|…)\s*\]$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-block px-3 py-0.5 mx-1.5 rounded-lg border-2 border-dashed border-[#312E81] bg-[#EEF2FF] text-[#312E81] font-mono font-black text-sm sm:text-base align-middle shadow-2xs"
        >
          [ ... ]
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function renderPromptWithGap(promptText: string) {
  if (!promptText) return null;

  if (promptText.includes('\n\n')) {
    const [meaningPart, ...rest] = promptText.split('\n\n');
    const sentencePart = rest.join('\n\n');
    const isMeaning = meaningPart.trim().toLowerCase().startsWith('meaning:');
    const cleanMeaning = meaningPart.trim().replace(/^meaning:\s*/i, '');

    return (
      <div className="flex flex-col items-center justify-center my-auto">
        {isMeaning && (
          <div className="text-xs sm:text-sm text-amber-950 bg-[#FFFBEB] border-2 border-amber-300 rounded-2xl px-4 py-2 mb-3.5 font-sans text-center leading-relaxed max-w-lg mx-auto shadow-2xs">
            <span className="font-mono not-italic font-black text-[10px] text-amber-800 uppercase block tracking-wider mb-0.5">
              Meaning / Definition
            </span>
            {cleanMeaning}
          </div>
        )}
        <div className="text-base sm:text-lg md:text-xl font-bold text-black leading-relaxed font-sans text-center">
          {renderGapSpans(sentencePart)}
        </div>
      </div>
    );
  }

  return (
    <div className="text-base sm:text-lg md:text-xl font-medium text-black leading-relaxed font-sans text-center py-4 my-auto whitespace-pre-line">
      {renderGapSpans(promptText)}
    </div>
  );
}

function getCompletedSentence(promptText: string, targetPhrase: string): string {
  if (!promptText || !targetPhrase) return '';
  const sentence = promptText.includes('\n\n')
    ? promptText.split('\n\n').slice(1).join('\n\n')
    : promptText;
  const clean = sentence.replace(/^["']|["']$/g, '');
  if (/\[\s*(?:\.{3,}|…)\s*\]/.test(clean)) {
    return clean.replace(/\[\s*(?:\.{3,}|…)\s*\]/g, targetPhrase);
  }
  return clean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  cards,
  onUpdateCard,
  onReviewBatchComplete,
  dailyCap,
  soundEnabled,
}) => {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [showPersianHint, setShowPersianHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const prevIsOpenRef = useRef(false);

  // وضعیت مد تایپ فعال (Active Typing Recall)
  const [isTypingMode, setIsTypingMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('studyos_review_typing_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [typingVerdict, setTypingVerdict] = useState<'correct' | 'incorrect' | null>(null);
  const typingInputRef = useRef<HTMLInputElement | null>(null);

  // بستن خودکار هینت با کلیک در هر نقطه دیگر از مدال یا صفحه
  useEffect(() => {
    if (!showPersianHint) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowPersianHint(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showPersianHint]);

  // فقط هنگام باز شدن اولیه مدال، صف مرور آماده می‌شود تا به‌روزرسانی کارت‌ها در میان جلسه باعث ریست شدن صف نشود
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const due = getDueCards(cards, dailyCap);
      setQueue(due);
      setCurrentIndex(0);
      setIsAnswerRevealed(false);
      setShowPersianHint(false);
      setReviewedCount(0);
      setTypedAnswer('');
      setTypingVerdict(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, cards, dailyCap]);

  // ریست اینپوت تایپ هنگام رفتن به کارت بعدی
  useEffect(() => {
    setTypedAnswer('');
    setTypingVerdict(null);
    if (isTypingMode && !isAnswerRevealed) {
      setTimeout(() => typingInputRef.current?.focus(), 50);
    }
  }, [currentIndex, isTypingMode, isAnswerRevealed]);

  const currentCard = queue[currentIndex];

  const handleCheckTypedAnswer = useCallback(() => {
    if (!currentCard) return;
    const cleanTyped = typedAnswer.trim().toLowerCase().replace(/[.,!?;:'"\-]/g, '');
    const cleanTarget = currentCard.targetPhrase.trim().toLowerCase().replace(/[.,!?;:'"\-]/g, '');

    const isMatch = cleanTyped.length > 0 && cleanTyped === cleanTarget;
    setTypingVerdict(isMatch ? 'correct' : 'incorrect');
    setIsAnswerRevealed(true);
    playSound(isMatch ? 'rating' : 'flip', soundEnabled);
  }, [currentCard, typedAnswer, soundEnabled]);

  const handleRevealAnswer = useCallback(() => {
    setIsAnswerRevealed(true);
    playSound('flip', soundEnabled);
  }, [soundEnabled]);

  const handleGrade = useCallback(
    (grade: ReviewGrade) => {
      if (!currentCard) return;

      const updated = calculateFSRS(currentCard, grade);
      onUpdateCard(updated);
      playSound('rating', soundEnabled);

      const nextCount = reviewedCount + 1;
      setReviewedCount(nextCount);

      if (grade === 1) {
        setQueue((prev) => [...prev, updated]);
      }

      const nextQueueLength = grade === 1 ? queue.length + 1 : queue.length;
      const nextIndex = currentIndex + 1;

      if (nextIndex < nextQueueLength) {
        setCurrentIndex(nextIndex);
        setIsAnswerRevealed(false);
        setShowPersianHint(false);
      } else {
        setCurrentIndex(nextIndex);
        setIsAnswerRevealed(false);
        setShowPersianHint(false);
        onReviewBatchComplete(nextCount);
        playSound('complete', soundEnabled);
      }
    },
    [currentCard, currentIndex, onReviewBatchComplete, onUpdateCard, queue.length, reviewedCount, soundEnabled]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !currentCard) return;

      // کلید Alt+T برای سوییچ سریع بین مد تایپی و معمولی
      if (e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        setIsTypingMode((prev) => {
          const next = !prev;
          try { localStorage.setItem('studyos_review_typing_mode', String(next)); } catch {}
          return next;
        });
        return;
      }

      if (!isAnswerRevealed) {
        if (isTypingMode) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleCheckTypedAnswer();
          }
        } else {
          if (e.code === 'Space') {
            e.preventDefault();
            handleRevealAnswer();
          }
        }
      } else {
        if (e.key === '1') handleGrade(1);
        else if (e.key === '2') handleGrade(2);
        else if (e.key === '3') handleGrade(3);
        else if (e.key === '4') handleGrade(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAnswerRevealed, currentCard, isTypingMode, handleCheckTypedAnswer, handleRevealAnswer, handleGrade]);

  if (!isOpen) return null;

  const isSessionFinished = !currentCard || currentIndex >= queue.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="FSRS Daily Flashcard Review Modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-[#FFFDF5] border-2 border-black rounded-3xl neo-shadow-lg flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* هدر مدال */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-black/2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#312E81]" />
            <div>
              <h2 className="text-base font-bold text-black font-sans">
                FSRS Spaced Retrieval Review
              </h2>
              <p className="text-xs font-mono text-black/60">
                Deliberate Active Recall • Overload Guard Cap: {dailyCap}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isSessionFinished && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isTypingMode;
                    setIsTypingMode(next);
                    try { localStorage.setItem('studyos_review_typing_mode', String(next)); } catch {}
                  }}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none active:translate-x-0.5 active:translate-y-0.5 ${
                    isTypingMode
                      ? 'bg-[#EEF2FF] border-[#312E81] text-[#312E81] shadow-2xs ring-1 ring-[#312E81]/30'
                      : 'bg-white hover:bg-black/5 border-black/20 text-black/60 shadow-2xs'
                  }`}
                  title="Toggle Active Typing Mode (Alt+T)"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Typing: {isTypingMode ? 'ON' : 'OFF'}</span>
                </button>

                <span dir="ltr" className="inline-block text-xs font-mono font-bold text-black bg-[#FFF3C4] px-2.5 py-1 rounded-xl border border-black/20 shadow-2xs">
                  {currentIndex + 1} / {queue.length}
                </span>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close review modal"
              className="p-1.5 rounded-xl border-2 border-black bg-white hover:bg-[#FFCDD2] shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* بدنه مدال */}
        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between min-h-[400px]">
          {isSessionFinished ? (
            <div className="text-center py-8 space-y-4 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-[#C8E6C9] border-2 border-black mx-auto flex items-center justify-center neo-shadow">
                <CheckCircle2 className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-black text-black">
                {reviewedCount > 0 ? 'Review Session Cleared!' : 'All Caught Up!'}
              </h3>
              <p className="text-xs font-mono text-black/70 max-w-md mx-auto leading-relaxed">
                {reviewedCount > 0
                  ? `You reviewed ${reviewedCount} cards. Your FSRS memory stability schedule has been updated to prevent forgetting curves.`
                  : 'No flashcards are due for review right now. Come back tomorrow or add new cards!'}
              </p>
              <div className="pt-2">
                <Button variant="secondary" size="lg" onClick={onClose}>
                  Done & Return to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full space-y-6">
              {/* نوار مشخصات کارت */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="indigo" size="sm">
                    {currentCard.skillTag || 'Vocabulary'}
                  </Badge>
                  {currentCard.sourceBookId && (
                    <Badge variant="neutral" size="sm">
                      {currentCard.sourceBookId} {currentCard.sourceUnit ? `U${currentCard.sourceUnit}` : ''}
                    </Badge>
                  )}
                </div>

                <div className="text-xs font-mono text-black/60 flex items-center gap-3">
                  <span>Reps: {currentCard.repetition || 0}</span>
                  <span>Interval: {currentCard.interval || 1}d</span>
                  {currentCard.stability !== undefined ? (
                    <span>Stability: {currentCard.stability}d</span>
                  ) : (
                    <span>Ease: {currentCard.easeFactor || 2.5}</span>
                  )}
                  {currentCard.difficulty !== undefined && (
                    <span>Diff: {currentCard.difficulty}</span>
                  )}
                </div>
              </div>

              {/* کانتینر کارت با هینت شناور بدون سربرگ و با تشخیص کلیک بیرون */}
              <div className="bg-white/95 border-2 border-black rounded-2xl p-5 sm:p-6 neo-shadow-sm flex flex-col justify-between min-h-[220px]">
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <span className="text-xs font-mono font-semibold text-black/50 uppercase tracking-widest">
                    {isAnswerRevealed ? 'TARGET RECALL' : 'CLOZE PROMPT'}
                  </span>

                  {/* دکمه لامپ هینت: فقط آیکون چراغ بدون متن */}
                  {currentCard.persianHint && (
                    <div className="relative" ref={hintRef}>
                      <button
                        type="button"
                        onClick={() => setShowPersianHint((prev) => !prev)}
                        className={`h-8 w-8 rounded-xl border-2 border-black flex items-center justify-center cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#000] ${
                          showPersianHint
                            ? 'bg-[#FFF3C4] text-amber-900'
                            : 'bg-white hover:bg-black/5 text-black/40'
                        }`}
                        title={showPersianHint ? 'مخفی کردن هینت' : 'نمایش هینت'}
                      >
                        <Lightbulb
                          className={`w-4 h-4 transition-transform ${
                            showPersianHint
                              ? 'fill-amber-400 text-amber-700 scale-110'
                              : 'text-black/40'
                          }`}
                        />
                      </button>

                      {/* حباب شناور بدون هیچ سربرگ یا عنوان اضافه */}
                      {showPersianHint && (
                        <div
                          dir="auto"
                          className="absolute right-0 top-10 z-40 w-64 bg-[#FFF3C4] border-2 border-black rounded-xl p-2.5 shadow-[3px_3px_0px_0px_#000] text-xs font-vazir font-bold text-black text-center animate-in fade-in zoom-in-95 duration-100 leading-relaxed"
                        >
                          {currentCard.persianHint}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* متن سوال */}
                <div className="py-2 my-auto">
                  {renderPromptWithGap(currentCard.prompt)}
                </div>

                {/* پاسخ آشکارشده و ارزیابی تایپی */}
                {isAnswerRevealed && (
                  <div className="pt-3 border-t border-black/10 text-center space-y-2 animate-in fade-in duration-150">
                    {isTypingMode && typingVerdict && (
                      <div className="mb-2">
                        {typingVerdict === 'correct' ? (
                          <div className="p-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-mono text-xs flex items-center justify-between shadow-2xs animate-in zoom-in-95">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><strong>Excellent!</strong> Perfect recall: <em>"{typedAnswer}"</em></span>
                            </div>
                            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">Correct</span>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl border-2 border-rose-400 bg-rose-50 text-rose-950 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs animate-in zoom-in-95 text-left">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                              <span>Your answer: <del className="text-rose-700 font-bold">{typedAnswer || '(empty)'}</del></span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-800">
                              Target: <mark className="bg-amber-200 px-1.5 py-0.5 rounded not-italic font-mono">{currentCard.targetPhrase}</mark>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="inline-block px-6 py-2 rounded-2xl bg-[#312E81] text-white font-mono text-xl sm:text-2xl font-black shadow-[2px_2px_0px_0px_#000] border-2 border-black tracking-wide">
                      {currentCard.targetPhrase}
                    </div>

                    {/* جمله نمونه تکمیل‌شده */}
                    {(() => {
                      const completed = getCompletedSentence(currentCard.prompt, currentCard.targetPhrase);
                      if (!completed || completed === currentCard.targetPhrase) return null;
                      return (
                        <div>
                          <div className="text-xs sm:text-sm italic text-slate-800 font-serif px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl inline-block max-w-full">
                            "{completed}"
                          </div>
                        </div>
                      );
                    })()}

                    {(currentCard.audioUk || currentCard.audioUs) && (
                      <div className="flex items-center justify-center gap-2.5 pt-0.5">
                        {currentCard.audioUk && (
                          <button
                            type="button"
                            onClick={() => playOfflineAudio(currentCard.audioUk)}
                            className="px-3 py-1 rounded-xl border-2 border-black bg-[#E0E7FF] hover:bg-[#C7D2FE] text-xs font-mono font-bold text-[#312E81] shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Play UK Audio"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#312E81]" />
                            <span>UK</span>
                          </button>
                        )}

                        {currentCard.audioUs && (
                          <button
                            type="button"
                            onClick={() => playOfflineAudio(currentCard.audioUs)}
                            className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFE0B2] hover:bg-[#FFCC80] text-xs font-mono font-bold text-amber-900 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Play US Audio"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-900" />
                            <span>US</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* دکمه‌های پاسخ‌دهی و FSRS */}
              <div className="pt-2 border-t border-black/10">
                {!isAnswerRevealed ? (
                  isTypingMode ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCheckTypedAnswer();
                      }}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                    >
                      <input
                        ref={typingInputRef}
                        type="text"
                        dir="ltr"
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        placeholder="Type the missing target phrase... (Press Enter to check)"
                        className="flex-1 px-4 py-3 rounded-2xl border-2 border-black bg-white font-mono text-sm sm:text-base shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#312E81] placeholder:text-black/35"
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                      />
                      <button
                        type="submit"
                        className="px-6 py-3 rounded-2xl border-2 border-black bg-[#C8E6C9] hover:bg-[#A5D6A7] text-black font-mono font-black text-sm shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                        <span>Check Recall</span>
                        <span className="text-xs opacity-60 font-sans">[↵]</span>
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRevealAnswer}
                      className="w-full py-3.5 rounded-2xl border-2 border-black bg-[#FF8A80] hover:bg-[#FF5252] text-black font-black text-sm sm:text-base shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      <span>Show Answer</span>
                      <span className="text-xs font-mono font-normal opacity-70">(Space)</span>
                    </button>
                  )
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-in fade-in">
                    <button
                      type="button"
                      onClick={() => handleGrade(1)}
                      className="py-3 px-2 rounded-xl border-2 border-black bg-[#FFCDD2] hover:bg-[#EF9A9A] text-black font-mono font-bold text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span>Again</span>
                      <span className="text-[10px] opacity-60 font-sans">[1]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGrade(2)}
                      className="py-3 px-2 rounded-xl border-2 border-black bg-[#FFE0B2] hover:bg-[#FFCC80] text-black font-mono font-bold text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span>Hard</span>
                      <span className="text-[10px] opacity-60 font-sans">[2]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGrade(3)}
                      className="py-3 px-2 rounded-xl border-2 border-black bg-[#C8E6C9] hover:bg-[#A5D6A7] text-black font-mono font-bold text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span>Good</span>
                      <span className="text-[10px] opacity-60 font-sans">[3]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGrade(4)}
                      className="py-3 px-2 rounded-xl border-2 border-black bg-[#D1C4E9] hover:bg-[#B39DDB] text-black font-mono font-bold text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span>Easy</span>
                      <span className="text-[10px] opacity-60 font-sans">[4]</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;