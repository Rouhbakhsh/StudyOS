import React, { useState, useMemo, useDeferredValue, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Play,
  Search,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { AppState, Flashcard } from '../../types';
import { CardItem3D } from './CardItem3D';
import { CardEditorModal } from './CardEditorModal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { getTodayDateString } from '../../utils/date';

interface CardsViewProps {
  state: AppState;
  onOpenReviewModal: () => void;
  onSaveCard: (card: Flashcard) => void;
  onDeleteCard: (id: string) => void;
  onNavigateToLexicon?: (word: string) => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  state,
  onOpenReviewModal,
  onSaveCard,
  onDeleteCard,
  onNavigateToLexicon,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [onlyDueToday, setOnlyDueToday] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

  // لود تدریجی کارت‌ها برای جلوگیری از افت فریم
  const [displayLimit, setDisplayLimit] = useState(36);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // شمارنده ریست تمام کارت‌ها
  const [resetTrigger, setResetTrigger] = useState(0);

  const todayStr = getTodayDateString();

  // تشخیص کلیک در فضای خالی صفحه جهت ریست تمام فلش‌کارت‌ها به حالت پیش‌فرض
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // اگر کلیک داخل کارت، دکمه، اینپوت یا مودال باشد نادیده بگیر
      if (
        target.closest('[data-card-item="true"]') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }
      setResetTrigger((prev) => prev + 1);
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const dueCardsCount = useMemo(() => {
    return state.flashcards.filter((c) => !c.dueDate || c.dueDate <= todayStr).length;
  }, [state.flashcards, todayStr]);

  const skillOptions = useMemo(() => {
    const skills = new Set<string>();
    state.flashcards.forEach((c) => {
      if (c.skillTag) skills.add(c.skillTag);
    });
    return Array.from(skills);
  }, [state.flashcards]);

  const filteredCards = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();

    return state.flashcards.filter((card) => {
      if (onlyDueToday) {
        const isDue = !card.dueDate || card.dueDate <= todayStr;
        if (!isDue) return false;
      }

      if (filterSkill !== 'all' && card.skillTag !== filterSkill) {
        return false;
      }

      if (q) {
        const matchPrompt = card.prompt.toLowerCase().includes(q);
        const matchTarget = card.targetPhrase.toLowerCase().includes(q);
        const matchPersian = (card.persianHint || '').toLowerCase().includes(q);
        if (!matchPrompt && !matchTarget && !matchPersian) return false;
      }

      return true;
    });
  }, [state.flashcards, deferredSearchQuery, filterSkill, onlyDueToday, todayStr]);

  useEffect(() => {
    setDisplayLimit(36);
  }, [deferredSearchQuery, filterSkill, onlyDueToday]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + 24, filteredCards.length));
        }
      },
      { rootMargin: '350px' }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [filteredCards.length]);

  const visibleCards = useMemo(() => {
    return filteredCards.slice(0, displayLimit);
  }, [filteredCards, displayLimit]);

  const handleEditCard = (card: Flashcard) => {
    setEditingCard(card);
    setIsEditorOpen(true);
  };

  const handleCreateCard = () => {
    setEditingCard(null);
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto min-h-[calc(100vh-120px)]">
      {/* ۱. هدر بالای صفحه */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="indigo" size="md">
                Active Retrieval Engine
              </Badge>
              <Badge variant={dueCardsCount > 0 ? 'coral' : 'mint'} size="sm">
                {dueCardsCount} Due for Review
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1.5 flex items-center gap-2">
              <Layers className="w-7 h-7 text-[#312E81]" />
              <span>FSRS Spaced Retrieval Cards ({state.flashcards.length})</span>
            </h1>
            <p className="text-xs text-black/70 font-mono mt-0.5">
              Cloze deletions • Active recall prompts • Modern FSRS memory stability scheduling
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={dueCardsCount === 0}
              onClick={onOpenReviewModal}
              className={`h-10 px-4 rounded-xl border-2 border-black font-mono text-xs font-bold flex items-center gap-2 transition-all ${
                dueCardsCount > 0
                  ? 'bg-[#C8E6C9] hover:bg-[#A5D6A7] text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
                  : 'bg-black/5 text-black/40 border-black/20 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Start Review ({dueCardsCount})</span>
            </button>

            <button
              type="button"
              onClick={handleCreateCard}
              className="h-10 px-4 rounded-xl border-2 border-black bg-[#FFF3C4] hover:bg-[#FFE082] text-black font-mono text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Card</span>
            </button>
          </div>
        </div>

        {/* ۲. نوار جستجو و فیلترها با ضربدر کم‌رنگ */}
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search prompt, target phrase, hint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-black/20 focus:border-black rounded-xl pl-9 pr-8 py-2 text-xs text-black focus:outline-none font-medium transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-black/30 hover:text-black/70 p-0.5 cursor-pointer transition-colors"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <button
              type="button"
              onClick={() => setOnlyDueToday(!onlyDueToday)}
              className={`px-3 py-1.5 rounded-xl border-2 border-black text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                onlyDueToday
                  ? 'bg-[#FFCDD2] text-black shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white text-black/70 hover:bg-black/5 shadow-[1px_1px_0px_0px_#000]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Due Today Only</span>
            </button>

            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl border-2 border-black/10 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setFilterSkill('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                  filterSkill === 'all'
                    ? 'bg-black text-white shadow-[1px_1px_0px_0px_#000]'
                    : 'bg-transparent text-black hover:bg-black/10'
                }`}
              >
                All Skills
              </button>
              {skillOptions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setFilterSkill(skill)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all whitespace-nowrap active:translate-x-0.5 active:translate-y-0.5 ${
                    filterSkill === skill
                      ? 'bg-black text-white shadow-[1px_1px_0px_0px_#000]'
                      : 'bg-transparent text-black hover:bg-black/10'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ۳. گرید کارت‌ها با رندر تدریجی و پشتیبانی از ریست همگانی */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12 bg-[#FFFDF5] border-2 border-black rounded-3xl neo-shadow p-6 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-black/30 mx-auto" />
          <h3 className="text-base font-bold text-black">No Cards Found</h3>
          <p className="text-xs font-mono text-black/60 max-w-sm mx-auto">
            {searchQuery || filterSkill !== 'all' || onlyDueToday
              ? 'No flashcards match the active filters. Clear filters to see all cards.'
              : 'Add high-yield cards from your curriculum units or push words from the Lexicon bank.'}
          </p>
          <Button variant="mint" size="sm" onClick={handleCreateCard}>
            Create New Card
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCards.map((card) => (
              <CardItem3D
                key={card.id}
                card={card}
                onEdit={handleEditCard}
                onDelete={onDeleteCard}
                soundEnabled={state.settings.soundEnabled}
                onNavigateToLexicon={onNavigateToLexicon}
                resetTrigger={resetTrigger}
              />
            ))}
          </div>

          {visibleCards.length < filteredCards.length && (
            <div
              ref={sentinelRef}
              className="py-4 text-center font-mono text-xs text-black/40 animate-pulse"
            >
              Loading more cards... ({visibleCards.length} / {filteredCards.length})
            </div>
          )}
        </div>
      )}

      {/* مدال ادیتور کارت */}
      <CardEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingCard(null);
        }}
        cardToEdit={editingCard}
        onSaveCard={onSaveCard}
      />
    </div>
  );
};

export default CardsView;