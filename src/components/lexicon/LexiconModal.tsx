import React, { useState } from 'react';
import { BookMarked } from 'lucide-react';
import { LexiconWord } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface LexiconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (word: LexiconWord) => void;
}

export const LexiconModal: React.FC<LexiconModalProps> = ({
  isOpen,
  onClose,
  onAddWord,
}) => {
  const [word, setWord] = useState('');
  const [level, setLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('B2');
  const [partOfSpeech, setPartOfSpeech] = useState<'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'idiom'>('adjective');
  const [phonetic, setPhonetic] = useState('');
  const [definition, setDefinition] = useState('');
  const [persian, setPersian] = useState('');
  const [example, setExample] = useState('');
  const [collocationsRaw, setCollocationsRaw] = useState('');

  const handleSubmit = () => {
    if (!word.trim() || !definition.trim()) return;

    const collocations = collocationsRaw
      .split(/[,،|]/)
      .map((c) => c.trim())
      .filter(Boolean);

    const newEntry: LexiconWord = {
      id: `lex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      word: word.trim(),
      level,
      partOfSpeech,
      phonetic: phonetic.trim() || `/${word.toLowerCase()}/`,
      definition: definition.trim(),
      persian: persian.trim(),
      example: example.trim(),
      collocations: collocations.length > 0 ? collocations : undefined,
    };

    onAddWord(newEntry);
    onClose();

    // Reset fields
    setWord('');
    setDefinition('');
    setPersian('');
    setExample('');
    setCollocationsRaw('');
    setPhonetic('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Lexicon Word (A1 → C1 Bank)"
      subtitle="Expand your master personal word vault with phonetic IPA and Persian translations."
    >
      <div className="space-y-4">
        {/* Row 1: Word & Level & POS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-black mb-1">Headword:</label>
            <input
              type="text"
              placeholder="e.g. formidable"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-black mb-1">CEFR Level:</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="w-full bg-white border border-black/20 rounded-xl px-2.5 py-2 text-xs text-black font-mono font-bold focus:outline-none focus:border-black"
            >
              <option value="A1">A1 — Elementary</option>
              <option value="A2">A2 — Pre-Intermediate</option>
              <option value="B1">B1 — Intermediate</option>
              <option value="B2">B2 — Upper-Intermediate</option>
              <option value="C1">C1 — Advanced (IELTS 7.5+)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-black mb-1">Part of Speech:</label>
            <select
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value as any)}
              className="w-full bg-white border border-black/20 rounded-xl px-2.5 py-2 text-xs text-black focus:outline-none focus:border-black"
            >
              <option value="noun">Noun</option>
              <option value="verb">Verb</option>
              <option value="adjective">Adjective</option>
              <option value="adverb">Adverb</option>
              <option value="phrase">Phrase</option>
              <option value="idiom">Idiom</option>
            </select>
          </div>
        </div>

        {/* Row 2: Phonetic & Persian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-black mb-1">Phonetic IPA:</label>
            <input
              type="text"
              placeholder="e.g. /ˈfɔː.mɪ.də.bəl/"
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              className="w-full bg-white font-mono border border-black/20 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-black mb-1">Persian Meaning (معنی فارسی):</label>
            <input
              type="text"
              dir="auto"
              placeholder="e.g. هولناک / دشوار و سترگ"
              value={persian}
              onChange={(e) => setPersian(e.target.value)}
              className="w-full bg-white font-vazir border border-black/20 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Definition */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">English Definition:</label>
          <input
            type="text"
            placeholder="e.g. Inspiring fear or respect through being impressively large, powerful, or capable."
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Example Sentence */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">Example Sentence:</label>
          <textarea
            rows={2}
            placeholder="e.g. The candidate faced a formidable challenge during the technical interview."
            value={example}
            onChange={(e) => setExample(e.target.value)}
            className="w-full bg-white border border-black/20 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black resize-none"
          />
        </div>

        {/* Collocations */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">
            Common Collocations (comma-separated):
          </label>
          <input
            type="text"
            placeholder="e.g. formidable challenge, formidable opponent, formidable task"
            value={collocationsRaw}
            onChange={(e) => setCollocationsRaw(e.target.value)}
            className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-black/10 flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="mint"
            size="md"
            icon={<BookMarked className="w-4 h-4" />}
            disabled={!word.trim() || !definition.trim()}
            onClick={handleSubmit}
          >
            Save Word
          </Button>
        </div>
      </div>
    </Modal>
  );
};
