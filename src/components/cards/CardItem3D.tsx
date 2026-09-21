import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Trash2, Calendar, BookOpen, Volume2, Lightbulb } from 'lucide-react';
import { Flashcard } from '../../types';
import { Badge } from '../common/Badge';
import { playSound } from '../../services/audio';
import { playOfflineAudio } from '../../services/oxfordService';

interface CardItem3DProps {
  card: Flashcard;
  onEdit: (card: Flashcard) => void;
  onDelete: (id: string) => void;
  soundEnabled: boolean;
  onNavigateToLexicon?: (word: string) => void;
  resetTrigger?: number;
}

export const CardItem3D: React.FC<CardItem3DProps> = ({
  card,
  onEdit,
  onDelete,
  soundEnabled,
  onNavigateToLexicon,
  resetTrigger,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPersianHint, setShowPersianHint] = useState(false);
  const hintRef = useRef<HTMLDivElement | null>(null);

  // برگشت به حالت پیش‌فرض (روی کارت و بسته شدن هینت) با کلیک در فضای خالی
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setIsFlipped(false);
      setShowPersianHint(false);
    }
  }, [resetTrigger]);

  // بستن خودکار هینت با کلیک در بیرون از حباب
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

  const handleFlip = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    setIsFlipped((prev) => {
      setShowPersianHint(false);
      return !prev;
    });
    playSound('flip', soundEnabled);
  };

  const handleOpenLexicon = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const targetWord = card.targetPhrase.trim();

    if (onNavigateToLexicon) {
      onNavigateToLexicon(targetWord);
    } else {
      const event = new CustomEvent('switch-tab', {
        bubbles: true,
        detail: { tab: 'lexicon', query: targetWord },
      });
      window.dispatchEvent(event);
      document.dispatchEvent(event);
    }
  };

  const cleanPersianHint = () => {
    if (!card.persianHint) return '';
    const match = card.persianHint.match(/^(.*?)\s*\(.*\)$/);
    if (match && /[\u0600-\u06FF]/.test(match[1])) {
      return match[1].trim();
    }
    return card.persianHint;
  };

  const isFromLexicon =
    card.id.startsWith('card-lex') ||
    card.id.startsWith('card-ox') ||
    card.sourceBookId === 'Lexicon' ||
    card.sourceBookId === 'Oxford 5000' ||
    card.skillTag?.toLowerCase().includes('vocabulary');

  const todayStr = new Date().toISOString().split('T')[0];
  const isDue = !card.dueDate || card.dueDate <= todayStr;

  return (
    <div
      data-card-item="true"
      className="perspective-1000 w-full h-[245px] select-none cursor-pointer group"
      onClick={handleFlip}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* ================= روی کارت (FRONT FACE) ================= */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow flex flex-col justify-between group-hover:bg-[#FFFDF5]/90 transition-opacity ${
            isFlipped ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-black/10">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="indigo" size="sm">
                  {card.skillTag || 'Vocabulary'}
                </Badge>
                {card.sourceBookId && (
                  <Badge variant="neutral" size="sm">
                    {card.sourceBookId} {card.sourceUnit ? `U${card.sourceUnit}` : ''}
                  </Badge>
                )}
                {isDue && (
                  <Badge variant="coral" size="sm">
                    Due Today
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 relative z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(card);
                  }}
                  title="Edit Card"
                  aria-label="Edit Card"
                  className="p-1 rounded-lg border border-black/20 bg-white hover:bg-[#FFF3C4] cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-black" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(card.id);
                  }}
                  title="Delete Card"
                  aria-label="Delete Card"
                  className="p-1 rounded-lg border border-black/20 bg-white hover:bg-[#FFCDD2] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-black" />
                </button>
              </div>
            </div>

            <div className="py-4 text-center">
              <div className="text-sm sm:text-base font-semibold text-black leading-relaxed font-sans line-clamp-3">
                {card.prompt}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/10 flex items-center justify-end text-[11px] font-mono text-black/50">
            <span>Ease: {card.easeFactor || 2.5}</span>
          </div>
        </div>

        {/* ================= پشت کارت (BACK FACE) ================= */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow flex flex-col justify-between ${
            isFlipped ? 'pointer-events-auto opacity-100 z-10' : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <span className="text-xs font-mono font-bold text-black/60 uppercase">
              Target Recall
            </span>

            <div className="flex items-center gap-1.5 shrink-0 relative z-20">
              {isFromLexicon && (
                <button
                  type="button"
                  onClick={handleOpenLexicon}
                  title="View in Lexicon"
                  className="h-7 px-2 rounded-lg border-2 border-black bg-white hover:bg-[#E0E7FF] text-black text-xs font-bold shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-black" />
                  <span>Lexicon</span>
                </button>
              )}

              {/* دکمه هینت: فقط چراغ بدون متن + پاپ‌اور شناور بدون هدر */}
              {card.persianHint && (
                <div className="relative" ref={hintRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPersianHint(!showPersianHint);
                    }}
                    title={showPersianHint ? 'مخفی کردن هینت' : 'نمایش هینت'}
                    className={`h-7 w-7 rounded-lg border-2 border-black flex items-center justify-center cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[1px_1px_0px_0px_#000] ${
                      showPersianHint ? 'bg-[#FFF3C4] text-amber-900' : 'bg-white hover:bg-black/5 text-black/40'
                    }`}
                  >
                    <Lightbulb
                      className={`w-3.5 h-3.5 transition-transform ${
                        showPersianHint ? 'fill-amber-400 text-amber-700 scale-110' : 'text-black/50'
                      }`}
                    />
                  </button>

                  {/* پاپ‌اور شناور بدون عنوان یا ضربدر اضافه */}
                  {showPersianHint && (
                    <div
                      dir="rtl"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8.5 z-50 w-56 bg-[#FFF3C4] border-2 border-black rounded-xl p-2.5 shadow-[3px_3px_0px_0px_#000] text-xs font-vazir font-semibold text-black text-center animate-in fade-in zoom-in-95 duration-100 leading-relaxed"
                    >
                      {cleanPersianHint()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-1 space-y-2">
            <div className="inline-block px-4 py-1.5 rounded-xl bg-[#312E81] text-white font-mono text-sm sm:text-base font-black neo-shadow-sm">
              {card.targetPhrase}
            </div>

            {/* دکمه‌های صوتی */}
            {(card.audioUk || card.audioUs) && (
              <div className="flex items-center gap-2 pt-0.5 relative z-20">
                {card.audioUk && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playOfflineAudio(card.audioUk);
                    }}
                    title="Play UK Pronunciation"
                    className="h-6 px-2 rounded-md border border-black bg-[#E0E7FF] hover:bg-[#C7D2FE] text-[10px] font-mono font-bold text-[#312E81] flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    <Volume2 className="w-3 h-3 text-[#312E81]" />
                    <span>UK</span>
                  </button>
                )}

                {card.audioUs && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playOfflineAudio(card.audioUs);
                    }}
                    title="Play US Pronunciation"
                    className="h-6 px-2 rounded-md border border-black bg-[#FFE0B2] hover:bg-[#FFCC80] text-[10px] font-mono font-bold text-amber-900 flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    <Volume2 className="w-3 h-3 text-amber-900" />
                    <span>US</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-mono text-black/70">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-black/50" />
              Due: {card.dueDate || 'Today'}
            </span>
            <span className="flex items-center gap-2">
              <span>Int: {card.interval || 1}d</span>
              <span>Reps: {card.repetition || 0}</span>
              <span>Lapses: {card.lapses || 0}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardItem3D;