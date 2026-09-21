import React, { useState } from 'react';
import { AlertOctagon } from 'lucide-react';
import { MistakeEntry, MistakeCategory } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface MistakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMistake: (mistake: MistakeEntry) => void;
}

export const MistakeModal: React.FC<MistakeModalProps> = ({
  isOpen,
  onClose,
  onAddMistake,
}) => {
  const [error, setError] = useState('');
  const [correction, setCorrection] = useState('');
  const [rule, setRule] = useState('');
  const [persianNote, setPersianNote] = useState('');
  const [category, setCategory] = useState<MistakeCategory>('Prepositions');
  const [sourceBookUnit, setSourceBookUnit] = useState('');

  const handleSubmit = () => {
    if (!error.trim() || !correction.trim()) return;

    const newMistake: MistakeEntry = {
      id: `mistake-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      error: error.trim(),
      correction: correction.trim(),
      rule: rule.trim(),
      persianNote: persianNote.trim(),
      category,
      sourceBookUnit: sourceBookUnit.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: 'unresolved',
    };

    onAddMistake(newMistake);
    onClose();

    setError('');
    setCorrection('');
    setRule('');
    setPersianNote('');
    setSourceBookUnit('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Mistake Vault Entry"
      subtitle="Transform production slips into permanent learning anchors."
    >
      <div className="space-y-4">
        {/* Category & Source */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-black mb-1">Error Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MistakeCategory)}
              className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs text-black font-semibold focus:outline-none focus:border-black"
            >
              <option value="Prepositions">Prepositions</option>
              <option value="Collocations">Collocations</option>
              <option value="Tenses">Tenses & Aspect</option>
              <option value="Articles">Articles (a/an/the)</option>
              <option value="False Friends">False Friends / Interference</option>
              <option value="Word Choice">Word Choice & Register</option>
              <option value="Pronunciation">Pronunciation & Stress</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-black mb-1">Source (Book & Unit):</label>
            <input
              type="text"
              placeholder="e.g. EGIU Unit 60 or Daily Free Sprint"
              value={sourceBookUnit}
              onChange={(e) => setSourceBookUnit(e.target.value)}
              className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Erroneous Expression */}
        <div>
          <label className="block text-xs font-bold text-[#FF2A5F] mb-1">
            ❌ Erroneous Expression / Sentence:
          </label>
          <input
            type="text"
            placeholder="e.g. I am looking forward to meet you."
            value={error}
            onChange={(e) => setError(e.target.value)}
            className="w-full bg-[#FFCDD2]/20 border border-black/20 rounded-xl px-3 py-2 text-xs font-medium text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Corrected Expression */}
        <div>
          <label className="block text-xs font-bold text-emerald-800 mb-1">
            ✅ Corrected Authentic Expression:
          </label>
          <input
            type="text"
            placeholder="e.g. I am looking forward to meeting you."
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            className="w-full bg-[#C8E6C9]/20 border border-black/20 rounded-xl px-3 py-2 text-xs font-medium text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Underlying Rule & Explanation */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">
            Underlying Linguistic Rule / Explanation:
          </label>
          <textarea
            rows={2}
            placeholder="e.g. 'Look forward to' has 'to' as a preposition, requiring an -ing gerund, not bare infinitive."
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            className="w-full bg-white border border-black/20 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black resize-none"
          />
        </div>

        {/* Persian Clue / Mnemonic */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">
            Persian Explanation / Mnemonic (توضیح یا یادآور به فارسی):
          </label>
          <input
            type="text"
            dir="auto"
            placeholder="e.g. بعد از عبارت look forward to حرف to حرف اضافه است، پس فعل بعد از آن حتما ing می‌گیرد."
            value={persianNote}
            onChange={(e) => setPersianNote(e.target.value)}
            className="w-full bg-white font-vazir border border-black/20 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-black/10 flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="rose"
            size="md"
            icon={<AlertOctagon className="w-4 h-4" />}
            disabled={!error.trim() || !correction.trim()}
            onClick={handleSubmit}
          >
            Log Mistake
          </Button>
        </div>
      </div>
    </Modal>
  );
};
