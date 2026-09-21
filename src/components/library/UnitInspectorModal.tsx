import React from 'react';
import {
  Clock,
  Layers,
  FileText,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { CurriculumBook, CurriculumUnit, UnitProgress, Flashcard } from '../../types';
import { UNIT_LOCATION_INDEX } from '../../services/scheduler';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface UnitInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: CurriculumBook | null;
  unit: CurriculumUnit | null;
  progress: UnitProgress | null;
  flashcards: Flashcard[];
  onNavigateToDay: (dayNumber: number) => void;
}

export const UnitInspectorModal: React.FC<UnitInspectorModalProps> = ({
  isOpen,
  onClose,
  book,
  unit,
  progress,
  flashcards,
  onNavigateToDay,
}) => {
  if (!book || !unit) return null;

  const unitKey = `${book.book_id}_${unit.unit}`;
  const locationInfo = UNIT_LOCATION_INDEX.get(unitKey)?.[0];
  const unitFlashcards = flashcards.filter(
    (c) => c.sourceBookId === book.book_id && c.sourceUnit === unit.unit
  );

  const isCompleted = Boolean(progress?.completed);
  const timeMins = Math.round((progress?.timeSpentSeconds || 0) / 60);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${book.book_id} Unit ${unit.unit}: ${unit.title}`}
      subtitle={`${book.book_title} • Level: ${book.target_level}`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Header Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/2.5 border border-black/10">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="indigo" size="sm">
              {book.skill}
            </Badge>
            <Badge variant="neutral" size="sm">
              {book.target_level}
            </Badge>
            {locationInfo && (
              <Badge variant="lavender" size="sm">
                Scheduled: Day {locationInfo.dayNumber} (Week {locationInfo.weekNumber})
              </Badge>
            )}
            <Badge variant={isCompleted ? 'mint' : 'cream'} size="sm">
              {isCompleted ? 'Completed ✅' : 'Pending'}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-black/70">
            <Clock className="w-3.5 h-3.5 text-black/50" />
            <span>Time Logged: {timeMins} mins</span>
          </div>
        </div>

        {/* 1. Sub-Gate Submissions History */}
        <div className="bg-[#FFFDF5] border-2 border-black/15 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#312E81]" />
              Deliberate Practice Production Records
            </span>
          </div>

          {/* Grammar Sentences */}
          {progress?.sentences && progress.sentences.filter(Boolean).length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-black">Personalized Production Sentences:</div>
              <div className="space-y-1">
                {progress.sentences.map((sent, sIdx) =>
                  sent ? (
                    <div
                      key={sIdx}
                      className="bg-black/2.5 border border-black/10 rounded-xl p-2 text-xs text-black font-sans"
                    >
                      {sIdx + 1}. {sent}
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Vocabulary Cloze */}
          {progress?.extractedCloze && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-black">Extracted Cloze Target:</div>
              <div className="bg-[#FFF3C4]/60 border border-black/15 rounded-xl p-2.5 text-xs text-black font-sans">
                {progress.extractedCloze}
              </div>
            </div>
          )}

          {/* Pronunciation Linking Notes */}
          {progress?.linkingNotes && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-black">Acoustic Linking & Shadowing Notes:</div>
              <div className="bg-[#D1C4E9]/40 border border-black/15 rounded-xl p-2.5 text-xs text-black font-sans">
                {progress.linkingNotes}
              </div>
            </div>
          )}

          {!progress?.sentences && !progress?.extractedCloze && !progress?.linkingNotes && (
            <p className="text-xs font-mono text-black/50 italic">
              No active sub-gate submissions recorded for this unit yet.
            </p>
          )}
        </div>

        {/* 2. Unit Key Notes & Mnemonic Exceptions */}
        <div className="bg-[#FFFDF5] border-2 border-black/15 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-black uppercase">
            <FileText className="w-3.5 h-3.5 text-black" />
            <span>Unit Key Notes & Persian Mnemonics</span>
          </div>

          {progress?.keyNotes?.trim() ? (
            <div
              dir="auto"
              className="bg-black/2.5 border border-black/10 font-vazir rounded-xl p-3 text-xs text-black leading-relaxed"
            >
              {progress.keyNotes}
            </div>
          ) : (
            <p className="text-xs font-mono text-black/50 italic">
              No key notes or mnemonics recorded for this unit yet.
            </p>
          )}
        </div>

        {/* 3. Associated SM-2 Flashcards */}
        <div className="bg-[#FFFDF5] border-2 border-black/15 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-black uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#312E81]" />
              <span>Associated SM-2 Cloze Cards ({unitFlashcards.length})</span>
            </span>
          </div>

          {unitFlashcards.length > 0 ? (
            <div className="space-y-2">
              {unitFlashcards.map((fc) => (
                <div
                  key={fc.id}
                  className="bg-white border border-black/15 rounded-xl p-3 text-xs space-y-1"
                >
                  <div className="font-semibold text-black">{fc.prompt}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#312E81] bg-[#312E81]/10 px-2 py-0.5 rounded">
                      {fc.targetPhrase}
                    </span>
                    {fc.persianHint && (
                      <span className="font-vazir text-black/70 text-[11px]" dir="auto">
                        ({fc.persianHint})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-mono text-black/50 italic">
              No flashcards extracted from this unit yet.
            </p>
          )}
        </div>

        {/* Footer Jump Button */}
        <div className="pt-3 border-t border-black/10 flex items-center justify-between">
          <Button variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>

          {locationInfo && (
            <Button
              variant="cream"
              size="md"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => {
                onClose();
                onNavigateToDay(locationInfo.dayNumber);
              }}
            >
              Jump to Day {locationInfo.dayNumber} in Today Dashboard ↗
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
