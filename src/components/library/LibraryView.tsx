import React, { useState } from 'react';
import {
  Library as LibraryIcon,
  Search,
  FileText,
} from 'lucide-react';
import { AppState, BookId, CurriculumBook, CurriculumUnit } from '../../types';
import { CURRICULUM_BOOKS } from '../../data/curriculumData';
import { UNIT_LOCATION_INDEX } from '../../services/scheduler';
import { UnitInspectorModal } from './UnitInspectorModal';
import { Badge } from '../common/Badge';

interface LibraryViewProps {
  state: AppState;
  onNavigateToDay: (dayNumber: number) => void;
  initialSearchQuery?: string;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  state,
  onNavigateToDay,
  initialSearchQuery = '',
}) => {
  const [selectedBookId, setSelectedBookId] = useState<BookId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [onlyWithNotes, setOnlyWithNotes] = useState(false);

  // Inspector modal state
  const [inspectingBook, setInspectingBook] = useState<CurriculumBook | null>(null);
  const [inspectingUnit, setInspectingUnit] = useState<CurriculumUnit | null>(null);

  const handleOpenInspector = (book: CurriculumBook, unit: CurriculumUnit) => {
    setInspectingBook(book);
    setInspectingUnit(unit);
  };

  // Compile full flat list of units with metadata
  const allIndexedUnits: {
    book: CurriculumBook;
    unit: CurriculumUnit;
    unitKey: string;
    completed: boolean;
    hasNotes: boolean;
    timeSpentSeconds: number;
    dayNumber?: number;
  }[] = [];

  CURRICULUM_BOOKS.forEach((book) => {
    book.units.forEach((u) => {
      const unitKey = `${book.book_id}_${u.unit}`;
      const prog = state.unitProgress[unitKey];
      const loc = UNIT_LOCATION_INDEX.get(unitKey)?.[0];

      allIndexedUnits.push({
        book,
        unit: u,
        unitKey,
        completed: Boolean(prog?.completed),
        hasNotes: Boolean(prog?.keyNotes?.trim()),
        timeSpentSeconds: prog?.timeSpentSeconds || 0,
        dayNumber: loc?.dayNumber,
      });
    });
  });

  const filteredUnits = allIndexedUnits.filter((item) => {
    if (selectedBookId !== 'all' && item.book.book_id !== selectedBookId) return false;
    if (onlyWithNotes && !item.hasNotes) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.unit.title.toLowerCase().includes(q);
      const matchUnit = String(item.unit.unit).toLowerCase().includes(q);
      const matchBook = item.book.book_title.toLowerCase().includes(q);
      const matchBookId = item.book.book_id.toLowerCase().includes(q);
      const prog = state.unitProgress[item.unitKey];
      const matchNotes = (prog?.keyNotes || '').toLowerCase().includes(q);
      if (!matchTitle && !matchUnit && !matchBook && !matchBookId && !matchNotes) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Banner */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="indigo" size="md">
                Second Brain Directory
              </Badge>
              <Badge variant="neutral" size="sm">
                828 Total Curriculum Units
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1.5 flex items-center gap-2">
              <LibraryIcon className="w-7 h-7 text-[#312E81]" />
              <span>Library & Global Unit Knowledge Archive</span>
            </h1>
            <p className="text-xs text-black/70 font-mono mt-0.5">
              Complete index of 10 textbooks • Instant concept search • Sub-gate archive & key mnemonic notes
            </p>
          </div>
        </div>

        {/* Global Quick Search Box & Notes Filter */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Instant Search: 'Passive', 'Used to', 'Inversion', 'Conditionals'..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-black/20 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-black focus:outline-none focus:border-black"
            />
          </div>

          {/* Notes Filter Toggle */}
          <label className="flex items-center gap-2 text-xs font-mono font-bold text-black cursor-pointer select-none bg-black/5 px-3 py-2 rounded-xl border border-black/10 hover:bg-black/10">
            <input
              type="checkbox"
              checked={onlyWithNotes}
              onChange={(e) => setOnlyWithNotes(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-black accent-[#312E81] cursor-pointer"
            />
            <span>Show only units with key notes</span>
          </label>
        </div>

        {/* 10 Books Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-black/5 mt-3">
          <span className="text-xs font-mono text-black/60 mr-1">Book:</span>
          <button
            onClick={() => setSelectedBookId('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
              selectedBookId === 'all'
                ? 'bg-black text-white neo-shadow-sm'
                : 'bg-black/5 text-black hover:bg-black/10'
            }`}
          >
            All 10 Books ({allIndexedUnits.length})
          </button>

          {CURRICULUM_BOOKS.map((b) => (
            <button
              key={b.book_id}
              onClick={() => setSelectedBookId(b.book_id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                selectedBookId === b.book_id
                  ? 'bg-[#312E81] text-white neo-shadow-sm'
                  : 'bg-black/5 text-black hover:bg-black/10'
              }`}
            >
              {b.book_id} ({b.units.length})
            </button>
          ))}
        </div>
      </div>

      {/* 2. Units Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-semibold text-black/60 px-1">
          <span>Showing {filteredUnits.length} of 828 Curriculum Units</span>
        </div>

        {filteredUnits.length === 0 ? (
          <div className="text-center py-12 bg-[#FFFDF5] border-2 border-black rounded-3xl neo-shadow p-6 space-y-3">
            <Search className="w-10 h-10 text-black/30 mx-auto" />
            <h3 className="text-base font-bold text-black">No Units Match Search</h3>
            <p className="text-xs font-mono text-black/60 max-w-sm mx-auto">
              Try a different keyword or reset the book filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUnits.map((item) => (
              <article
                key={item.unitKey}
                onClick={() => handleOpenInspector(item.book, item.unit)}
                className={`cursor-pointer bg-[#FFFDF5] border-2 border-black rounded-2xl p-3.5 neo-shadow-sm hover:scale-[1.01] transition-all flex flex-col justify-between ${
                  item.completed ? 'bg-[#C8E6C9]/30' : 'hover:bg-[#FFF3C4]/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-[11px] bg-black text-white px-1.5 py-0.5 rounded">
                        {item.book.book_id} U{item.unit.unit}
                      </span>
                      {item.dayNumber && (
                        <Badge variant="lavender" size="sm">
                          Day {item.dayNumber}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {item.hasNotes && (
                        <span title="Contains Key Notes">
                          <FileText className="w-3.5 h-3.5 text-emerald-800" />
                        </span>
                      )}
                      <Badge variant={item.completed ? 'mint' : 'neutral'} size="sm">
                        {item.completed ? '✓' : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-black font-sans leading-snug">
                    {item.unit.title}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-mono text-black/60">
                  <span>{item.book.skill}</span>
                  <span className="text-black font-semibold underline">Inspect ↗</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Unit Inspector Modal */}
      <UnitInspectorModal
        isOpen={inspectingBook !== null && inspectingUnit !== null}
        onClose={() => {
          setInspectingBook(null);
          setInspectingUnit(null);
        }}
        book={inspectingBook}
        unit={inspectingUnit}
        progress={
          inspectingBook && inspectingUnit
            ? state.unitProgress[`${inspectingBook.book_id}_${inspectingUnit.unit}`] || null
            : null
        }
        flashcards={state.flashcards}
        onNavigateToDay={onNavigateToDay}
      />
    </div>
  );
};
