import React, { useState, useEffect } from 'react';
import { Layers, Sparkles } from 'lucide-react';
import { Flashcard } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { parseClozeString } from '../../services/fsrs';
import { getTodayDateString } from '../../utils/date';

interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit: Flashcard | null;
  onSaveCard: (card: Flashcard) => void;
}

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
  isOpen,
  onClose,
  cardToEdit,
  onSaveCard,
}) => {
  const [prompt, setPrompt] = useState('');
  const [targetPhrase, setTargetPhrase] = useState('');
  const [persianHint, setPersianHint] = useState('');
  const [skillTag, setSkillTag] = useState('Vocabulary');
  const [sourceBookId, setSourceBookId] = useState('');
  const [sourceUnit, setSourceUnit] = useState('');

  // Quick cloze parser input
  const [rawParserText, setRawParserText] = useState('');

  useEffect(() => {
    if (cardToEdit) {
      setPrompt(cardToEdit.prompt);
      setTargetPhrase(cardToEdit.targetPhrase);
      setPersianHint(cardToEdit.persianHint || '');
      setSkillTag(cardToEdit.skillTag || 'Vocabulary');
      setSourceBookId(cardToEdit.sourceBookId || '');
      setSourceUnit(cardToEdit.sourceUnit || '');
      setRawParserText('');
    } else {
      setPrompt('');
      setTargetPhrase('');
      setPersianHint('');
      setSkillTag('Vocabulary');
      setSourceBookId('');
      setSourceUnit('');
      setRawParserText('');
    }
  }, [cardToEdit, isOpen]);

  const handleParseRaw = () => {
    if (!rawParserText.trim()) return;
    const parsed = parseClozeString(rawParserText);
    setPrompt(parsed.prompt);
    setTargetPhrase(parsed.targetPhrase);
    if (parsed.persianHint) setPersianHint(parsed.persianHint);
  };

  const handleSave = () => {
    if (!targetPhrase.trim() || !prompt.trim()) return;

    const todayStr = getTodayDateString();

    const card: Flashcard = cardToEdit
      ? {
          ...cardToEdit,
          prompt: prompt.trim(),
          targetPhrase: targetPhrase.trim(),
          persianHint: persianHint.trim(),
          skillTag,
          sourceBookId: sourceBookId.trim() || undefined,
          sourceUnit: sourceUnit.trim() || undefined,
        }
      : {
          id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          prompt: prompt.trim(),
          targetPhrase: targetPhrase.trim(),
          persianHint: persianHint.trim(),
          interval: 1,
          repetition: 0,
          easeFactor: 2.5,
          dueDate: todayStr,
          lapses: 0,
          skillTag,
          sourceBookId: sourceBookId.trim() || undefined,
          sourceUnit: sourceUnit.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

    onSaveCard(card);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cardToEdit ? 'Edit Flashcard (Non-Destructive)' : 'Create New FSRS Cloze Card'}
      subtitle={
        cardToEdit
          ? 'Scheduling intervals & ease factor are preserved.'
          : 'Deliberate cloze deletion active recall card.'
      }
    >
      <div className="space-y-4">
        {/* Quick Cloze Syntax Auto-Fill */}
        <div className="bg-black/2.5 border border-black/10 rounded-2xl p-3.5 space-y-2">
          <label className="text-xs font-mono font-bold text-black flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#312E81]" />
              Quick Cloze Syntax Parser:
            </span>
            <span className="text-[10px] text-black/50">[target] (persian hint)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. She decided to [embark on] (شروع کردن / آغازیدن) a new academic journey."
              value={rawParserText}
              onChange={(e) => setRawParserText(e.target.value)}
              className="flex-1 bg-white border border-black/20 rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
            />
            <Button variant="cream" size="sm" onClick={handleParseRaw}>
              Parse
            </Button>
          </div>
        </div>

        {/* Prompt with [ ... ] */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">
            Prompt Sentence (Use [ ... ] for the masked target):
          </label>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. She decided to [ ... ] a new academic journey."
            className="w-full bg-white border border-black/20 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black resize-none"
          />
        </div>

        {/* Target Phrase */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">
            Target Phrase / Hidden Word:
          </label>
          <input
            type="text"
            value={targetPhrase}
            onChange={(e) => setTargetPhrase(e.target.value)}
            placeholder="e.g. embark on"
            className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Persian Hint */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">
            Persian Hint / Meaning (معنی یا کلید به فارسی):
          </label>
          <input
            type="text"
            dir="auto"
            value={persianHint}
            onChange={(e) => setPersianHint(e.target.value)}
            placeholder="e.g. آغاز کردن / وارد کاری شدن"
            className="w-full bg-white font-vazir border border-black/20 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Metadata Row: Skill Tag, Book, Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-black mb-1">Skill Tag:</label>
            <select
              value={skillTag}
              onChange={(e) => setSkillTag(e.target.value)}
              className="w-full bg-white border border-black/20 rounded-xl px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-black"
            >
              <option value="Vocabulary">Vocabulary</option>
              <option value="Grammar">Grammar</option>
              <option value="Collocations">Collocations</option>
              <option value="Phrasal Verbs">Phrasal Verbs</option>
              <option value="Advanced Vocabulary">Advanced Vocabulary</option>
              <option value="Speaking & Pronunciation">Speaking & Pronunciation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1">Book ID (optional):</label>
            <input
              type="text"
              value={sourceBookId}
              onChange={(e) => setSourceBookId(e.target.value)}
              placeholder="e.g. OWS-ADV"
              className="w-full bg-white border border-black/20 rounded-xl px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1">Unit # (optional):</label>
            <input
              type="text"
              value={sourceUnit}
              onChange={(e) => setSourceUnit(e.target.value)}
              placeholder="e.g. 4"
              className="w-full bg-white border border-black/20 rounded-xl px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-black/10 flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="mint"
            size="md"
            icon={<Layers className="w-4 h-4" />}
            disabled={!targetPhrase.trim() || !prompt.trim()}
            onClick={handleSave}
          >
            {cardToEdit ? 'Save Changes' : 'Create Flashcard'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
