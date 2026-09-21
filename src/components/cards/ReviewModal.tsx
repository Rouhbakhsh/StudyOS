import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Layers,
  Lightbulb,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { Flashcard } from '../../types';
import { calculateSM2, ReviewGrade, getDueCards } from '../../services/sm2';
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

function renderPromptWithGap(promptText: string) {
  if (!promptText) return '';
  const parts = promptText.split(/(\[\s*(?:\.{3,}\vert{}…)\s*\])/g);
  if (parts.length === 1) return promptText;

  return parts.map((part, i) => {
    if (/^\[\s*(?:\.{3,}\vert{}…)\s*\]$/.test(part)) {
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

  useEffect(() => {
    if (isOpen) {
      const due = getDueCards(cards, dailyCap);
      setQueue(due);
      setCurrentIndex(0);
      setIsAnswerRevealed(false);
      setShowPersianHint(false);
      setReviewedCount(0);
    }
  }, [isOpen, cards, dailyCap]);

  const currentCard = queue[currentIndex];

  const handleRevealAnswer = useCallback(() => {
    setIsAnswerRevealed(true);
    playSound('flip', soundEnabled);
  }, [soundEnabled]);

  const handleGrade = useCallback(
    (grade: ReviewGrade) => {
      if (!currentCard) return;

      const updated = calculateSM2(currentCard, grade);
      onUpdateCard(updated);
      playSound('rating', soundEnabled);

      const nextCount = reviewedCount + 1;
      setReviewedCount(nextCount);

      if (grade === 1) {
        setQueue((prev) => [...prev, updated]);
      }

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsAnswerRevealed(false);
        setShowPersianHint(false);
      } else {
        onReviewBatchComplete(nextCount);
        playSound('complete', soundEnabled);
      }
    },
    [currentCard, currentIndex, onReviewBatchComplete, onUpdateCard, queue.length, reviewedCount, soundEnabled]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !currentCard) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isAnswerRevealed) {
          handleRevealAnswer();
        }
      } else if (isAnswerRevealed) {
        if (e.key === '1') handleGrade(1);
        else if (e.key === '2') handleGrade(2);
        else if (e.key === '3') handleGrade(3);
        else if (e.key === '4') handleGrade(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAnswerRevealed, currentCard, handleRevealAnswer, handleGrade]);

  if (!isOpen) return null;

  const isSessionFinished = !currentCard || currentIndex >= queue.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SM-2 Daily Flashcard Review Modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-[#FFFDF5] border-2 border-black rounded-3xl neo-shadow-lg flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* هدر مدال */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-black/2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#312E81]" />
            <div>
              <h2 className="text-base font-bold text-black font-sans">
                SM-2 Spaced Retrieval Review
              </h2>
              <p className="text-xs font-mono text-black/60">
                Deliberate Active Recall • Overload Guard Cap: {dailyCap}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isSessionFinished && (
              <span className="text-xs font-mono font-bold text-black bg-[#FFF3C4] px-2.5 py-1 rounded-xl border border-black/20">
                {currentIndex + 1} / {queue.length}
              </span>
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
                Review Session Cleared!
              </h3>
              <p className="text-xs font-mono text-black/70 max-w-md mx-auto leading-relaxed">
                You reviewed {reviewedCount} cards. Your SM-2 interval schedule has been updated to prevent forgetting curves.
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
                  <span>Ease: {currentCard.easeFactor || 2.5}</span>
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
                <div className="text-base sm:text-lg md:text-xl font-medium text-black leading-relaxed font-sans text-center py-4 my-auto">
                  {renderPromptWithGap(currentCard.prompt)}
                </div>

                {/* پاسخ آشکارشده */}
                {isAnswerRevealed && (
                  <div className="pt-3 border-t border-black/10 text-center space-y-2.5 animate-in fade-in duration-150">
                    <div className="inline-block px-6 py-2 rounded-2xl bg-[#312E81] text-white font-mono text-xl sm:text-2xl font-black shadow-[2px_2px_0px_0px_#000] border-2 border-black tracking-wide">
                      {currentCard.targetPhrase}
                    </div>

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

              {/* دکمه‌های پاسخ‌دهی و SM-2 */}
              <div className="pt-2 border-t border-black/10">
                {!isAnswerRevealed ? (
                  <button
                    type="button"
                    onClick={handleRevealAnswer}
                    className="w-full py-3.5 rounded-2xl border-2 border-black bg-[#FF8A80] hover:bg-[#FF5252] text-black font-black text-sm sm:text-base shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                  >
                    <span>Show Answer</span>
                    <span className="text-xs font-mono font-normal opacity-70">(Space)</span>
                  </button>
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