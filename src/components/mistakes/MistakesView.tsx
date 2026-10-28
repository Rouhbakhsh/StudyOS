import React, { useState } from 'react';
import {
  AlertOctagon,
  Plus,
  Layers,
  Search,
  Check,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { AppState, MistakeEntry, Flashcard } from '../../types';
import { MistakeModal } from './MistakeModal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { playSound } from '../../services/audio';
import { getTodayDateString } from '../../utils/date';

interface MistakesViewProps {
  state: AppState;
  onAddMistake: (mistake: MistakeEntry) => void;
  onUpdateMistake: (id: string, updates: Partial<MistakeEntry>) => void;
  onDeleteMistake: (id: string) => void;
  onPushMistakeToFlashcards: (card: Flashcard, mistakeId: string) => void;
}

export const MistakesView: React.FC<MistakesViewProps> = ({
  state,
  onAddMistake,
  onUpdateMistake,
  onDeleteMistake,
  onPushMistakeToFlashcards,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const unresolvedCount = state.mistakes.filter((m) => m.status === 'unresolved').length;
  const masteredCount = state.mistakes.filter((m) => m.status === 'mastered').length;

  const filteredMistakes = state.mistakes.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchError = item.error.toLowerCase().includes(q);
      const matchCorr = item.correction.toLowerCase().includes(q);
      const matchRule = item.rule.toLowerCase().includes(q);
      const matchPersian = (item.persianNote || '').toLowerCase().includes(q);
      if (!matchError && !matchCorr && !matchRule && !matchPersian) return false;
    }

    return true;
  });

  const handleCreateFlashcardFromMistake = (mistake: MistakeEntry) => {
    // Generate prompt with [ ... ] masked target
    // Look for difference between error and correction, or mask the key segment
    const prompt = `Incorrect: "${mistake.error}"\nCorrect formulation: [ ... ]`;

    const newCard: Flashcard = {
      id: `card-mistake-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceBookId: mistake.sourceBookUnit || 'Mistake Vault',
      prompt,
      targetPhrase: mistake.correction,
      persianHint: mistake.persianNote
        ? `${mistake.persianNote} — (${mistake.rule})`
        : mistake.rule,
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      stability: 0,
      difficulty: 0,
      state: 0,
      dueDate: getTodayDateString(),
      lapses: 0,
      skillTag: 'Grammar',
      createdAt: new Date().toISOString(),
    };

    onPushMistakeToFlashcards(newCard, mistake.id);
    playSound('complete', state.settings.soundEnabled);
  };

  const handleToggleStatus = (mistake: MistakeEntry) => {
    const nextStatus = mistake.status === 'unresolved' ? 'mastered' : 'unresolved';
    onUpdateMistake(mistake.id, { status: nextStatus });
    playSound('complete', state.settings.soundEnabled);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Banner */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="rose" size="md">
                Error Reconstruction Engine
              </Badge>
              <Badge variant="neutral" size="sm">
                Zero Repetitive Slips
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1.5 flex items-center gap-2">
              <AlertOctagon className="w-7 h-7 text-[#FF2A5F]" />
              <span>Mistake Vault & Flashcard Bridge</span>
            </h1>
            <p className="text-xs text-black/70 font-mono mt-0.5">
              Analyze grammatical, prepositional, and collocation errors • Bridge directly to FSRS spaced repetition
            </p>
          </div>

          <Button
            variant="rose"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            + Log New Mistake
          </Button>
        </div>

        {/* 2 Mini-Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="bg-[#FFCDD2]/30 border border-black/10 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-rose-900 uppercase">
                Active Unresolved Slips
              </div>
              <div className="text-2xl font-mono font-black text-black">
                {unresolvedCount} Errors
              </div>
            </div>
            <AlertOctagon className="w-6 h-6 text-[#FF2A5F]" />
          </div>

          <div className="bg-[#C8E6C9]/30 border border-black/10 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-emerald-900 uppercase">
                Mastered & Eliminated
              </div>
              <div className="text-2xl font-mono font-black text-black">
                {masteredCount} Errors
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-800" />
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search error, rule, or Farsi explanation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-black/20 rounded-xl pl-9 pr-3 py-2 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-black/60 mr-1">Status:</span>
            {(['all', 'unresolved', 'mastered'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-black text-white neo-shadow-sm'
                    : 'bg-black/5 text-black hover:bg-black/10'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-black/5 mt-3">
          <span className="text-xs font-mono text-black/60 mr-1">Category:</span>
          {[
            'all',
            'Prepositions',
            'Collocations',
            'Tenses',
            'Articles',
            'False Friends',
            'Word Choice',
            'Pronunciation',
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer transition-all ${
                categoryFilter === cat
                  ? 'bg-[#312E81] text-white font-bold neo-shadow-sm'
                  : 'bg-black/5 text-black hover:bg-black/10'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Mistakes Feed */}
      {filteredMistakes.length === 0 ? (
        <div className="text-center py-12 bg-[#FFFDF5] border-2 border-black rounded-3xl neo-shadow p-6 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-black">No Mistakes Found in Vault</h3>
          <p className="text-xs font-mono text-black/60 max-w-sm mx-auto">
            Log recurring syntactic slips or false friends encountered during textbook drills.
          </p>
          <Button variant="rose" size="sm" onClick={() => setIsModalOpen(true)}>
            + Log Mistake Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMistakes.map((mistake) => (
            <article
              key={mistake.id}
              className={`bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow transition-all ${
                mistake.status === 'mastered' ? 'bg-[#FFFDF5]/75' : ''
              }`}
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="rose" size="sm">
                    {mistake.category}
                  </Badge>
                  {mistake.sourceBookUnit && (
                    <Badge variant="neutral" size="sm">
                      {mistake.sourceBookUnit}
                    </Badge>
                  )}
                  <Badge variant={mistake.status === 'mastered' ? 'mint' : 'cream'} size="sm">
                    {mistake.status === 'mastered' ? 'Mastered ✅' : 'Unresolved'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(mistake)}
                    className="text-xs font-mono text-black/70 hover:text-black underline cursor-pointer"
                  >
                    {mistake.status === 'mastered' ? 'Mark Unresolved' : 'Mark Mastered ✓'}
                  </button>

                  <button
                    onClick={() => onDeleteMistake(mistake.id)}
                    title="Delete Mistake"
                    aria-label="Delete Mistake"
                    className="p-1 rounded-lg border border-black/20 bg-white hover:bg-[#FFCDD2] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-black" />
                  </button>
                </div>
              </div>

              {/* Error vs Correction Split */}
              <div className="py-3 space-y-2.5">
                <div className="bg-[#FFCDD2]/30 border border-black/15 rounded-2xl p-3">
                  <div className="text-[10px] font-mono font-bold text-rose-900 uppercase">
                    ❌ Erroneous Production:
                  </div>
                  <div className="text-sm font-bold text-rose-950 mt-0.5 line-through">
                    {mistake.error}
                  </div>
                </div>

                <div className="bg-[#C8E6C9]/40 border border-black/15 rounded-2xl p-3">
                  <div className="text-[10px] font-mono font-bold text-emerald-900 uppercase">
                    ✅ Authentic Native Target:
                  </div>
                  <div className="text-sm font-black text-black mt-0.5">
                    {mistake.correction}
                  </div>
                </div>

                {/* Rule & Persian Explanation */}
                <div className="bg-black/2.5 border border-black/10 rounded-2xl p-3 space-y-1.5">
                  <div className="text-xs text-black leading-relaxed font-sans">
                    <span className="font-bold text-black/70">Linguistic Rule: </span>
                    {mistake.rule}
                  </div>

                  {mistake.persianNote && (
                    <div
                      dir="auto"
                      className="bg-[#FFF3C4]/80 border border-black/15 rounded-xl px-3 py-2 text-xs font-vazir font-semibold text-black"
                    >
                      <span className="font-sans font-bold text-[10px] text-black/50 ml-1">یادآور فارسی: </span>
                      {mistake.persianNote}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-black/50">
                  Logged: {new Date(mistake.createdAt).toLocaleDateString()}
                </span>

                <Button
                  variant={mistake.flashcardCreated ? 'primary' : 'lavender'}
                  size="sm"
                  icon={mistake.flashcardCreated ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Layers className="w-3.5 h-3.5" />}
                  onClick={() => handleCreateFlashcardFromMistake(mistake)}
                  disabled={mistake.flashcardCreated}
                >
                  {mistake.flashcardCreated ? 'Flashcard Created ✅' : 'Create Flashcard from Mistake'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Log Mistake Modal */}
      <MistakeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddMistake={onAddMistake}
      />
    </div>
  );
};
