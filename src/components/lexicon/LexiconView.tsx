import React, { useState, useEffect, useMemo, useDeferredValue, useCallback, useRef } from 'react';
import {
  Search,
  Volume2,
  BookOpen,
  GraduationCap,
  Layers,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import { SearchIndexItem, OxfordWordDetail, SenseItem } from '../../types/oxford';
import { AppState, Flashcard } from '../../types';
import * as oxfordService from '../../services/oxfordService';
import { showToast } from '../../services/notification';
import { Badge } from '../common/Badge';

export interface LexiconViewProps {
  state: AppState;
  onPushToFlashcards: (card: Flashcard) => void;
  onRemoveFromFlashcards?: (targetPhrase: string) => void;
  initialSearchQuery?: string;
  onAddWord?: (word: any) => void;
  onDeleteWord?: (id: string) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ردیف مموایز شده برای فهرست واژگان ستون چپ
const WordListItem = React.memo(
  ({
    item,
    isSelected,
    inCards,
    onSelect,
  }: {
    item: SearchIndexItem;
    isSelected: boolean;
    inCards: boolean;
    onSelect: (id: number, word: string) => void;
  }) => {
    const levelStr = (item.lvl || 'B2').toUpperCase();

    return (
      <div
        id={`word-item-${item.id}`}
        onClick={() => onSelect(item.id, item.w || '')}
        className={`px-3 py-2.5 rounded-xl border-2 text-xs cursor-pointer transition-all flex items-center justify-between select-none active:translate-x-0.5 active:translate-y-0.5 ${
          isSelected
            ? 'bg-[#EEF2FF] border-[#312E81] text-[#312E81] font-bold shadow-[2px_2px_0px_0px_#312E81]'
            : 'bg-white hover:bg-black/5 text-black border-black/20 shadow-[1px_1px_0px_0px_#000]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate tracking-tight text-[13px]">{item.w}</span>
          <span className="text-[10px] font-mono italic opacity-50">
            {item.p || ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {inCards && (
            <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
          )}
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
              isSelected
                ? 'bg-[#312E81] text-white border-[#312E81]'
                : 'bg-black/5 border-black/15 text-black/70'
            }`}
          >
            {levelStr}
          </span>
        </div>
      </div>
    );
  }
);

WordListItem.displayName = 'WordListItem';

export const LexiconView: React.FC<LexiconViewProps> = ({
  state,
  onPushToFlashcards,
  onRemoveFromFlashcards,
  initialSearchQuery = '',
}) => {
  const [indexItems, setIndexItems] = useState<SearchIndexItem[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [onlyAcademic, setOnlyAcademic] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedWord, setSelectedWord] = useState<{ id: number; w: string } | null>(null);
  const [activeWordDetail, setActiveWordDetail] = useState<OxfordWordDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // وضعیت نمایش کادر شناور یادداشت/ترجمه
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);
  const noteContainerRef = useRef<HTMLDivElement | null>(null);

  const [showVerbForms, setShowVerbForms] = useState<boolean>(false);

  const [displayCount, setDisplayCount] = useState<number>(60);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const lastSelectedQueryRef = useRef<string>('');

  const [customPersianNote, setCustomPersianNote] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('oxford_persian_notes') || '{}');
    } catch {
      return {};
    }
  });

  // بستن خودکار پاپ‌اور هینت با کلیک در هر نقطه دیگر از صفحه
  useEffect(() => {
    if (!showNoteInput) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        noteContainerRef.current &&
        !noteContainerRef.current.contains(event.target as Node)
      ) {
        setShowNoteInput(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showNoteInput]);

  const flashcardWordSet = useMemo(() => {
    const list = state.flashcards || [];
    return new Set(list.map((c) => (c.targetPhrase || '').trim().toLowerCase()));
  }, [state.flashcards]);

  useEffect(() => {
    oxfordService.getSearchIndex().then((data) => {
      setIndexItems(data || []);
      setIsLoading(false);
      if (data && data.length > 0 && !selectedWord && !initialSearchQuery) {
        setSelectedWord({ id: data[0].id, w: data[0].w || '' });
      }
    });
  }, []);

  useEffect(() => {
    if (selectedWord) {
      setLoadingDetail(true);
      setShowNoteInput(false);
      const fetcher =
        (oxfordService as any).getWordDetail ||
        (oxfordService as any).getWordDetailById;

      if (typeof fetcher === 'function') {
        fetcher(selectedWord.id, selectedWord.w).then((detail: OxfordWordDetail | null) => {
          setActiveWordDetail(detail);
          if (detail && detail.word) {
            setCustomPersianNote(savedNotes[detail.word.toLowerCase()] || '');
          }
          setLoadingDetail(false);
        });
      } else {
        setLoadingDetail(false);
      }
    }
  }, [selectedWord]);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      setSelectedLevel('all');
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    setDisplayCount(60);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [deferredSearchQuery, selectedLevel, onlyAcademic]);

  const handleNoteChange = (text: string) => {
    setCustomPersianNote(text);
    if (activeWordDetail && activeWordDetail.word) {
      const updated = { ...savedNotes, [activeWordDetail.word.toLowerCase()]: text };
      setSavedNotes(updated);
      try {
        localStorage.setItem('oxford_persian_notes', JSON.stringify(updated));
      } catch {}
    }
  };

  const filteredIndex = useMemo(() => {
    const q = (deferredSearchQuery || '').trim().toLowerCase();
    const items = indexItems || [];

    return items
      .filter((item) => {
        const itemLvl = (item.lvl || '').toUpperCase();
        if (selectedLevel !== 'all' && itemLvl !== selectedLevel.toUpperCase()) {
          return false;
        }
        if (onlyAcademic && (!item.tags || item.tags.length === 0)) {
          return false;
        }
        const wordText = (item.w || '').toLowerCase();
        if (q && !wordText.includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!q) return 0;
        const aWord = (a.w || '').toLowerCase();
        const bWord = (b.w || '').toLowerCase();
        const aStart = aWord.startsWith(q);
        const bStart = bWord.startsWith(q);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return 0;
      });
  }, [indexItems, deferredSearchQuery, selectedLevel, onlyAcademic]);

  // انتخاب خودکار اولین نتیجه و اسکرول نرم در فهرست سمت چپ
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== lastSelectedQueryRef.current) {
      const q = initialSearchQuery.trim().toLowerCase();
      const target =
        filteredIndex.find((item) => (item.w || '').toLowerCase() === q) ||
        (filteredIndex.length > 0 ? filteredIndex[0] : null);

      if (target) {
        setSelectedWord({ id: target.id, w: target.w || '' });
        lastSelectedQueryRef.current = initialSearchQuery;
        setTimeout(() => {
          const el = document.getElementById(`word-item-${target.id}`);
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 80);
      }
    }
  }, [initialSearchQuery, filteredIndex]);

  const visibleItems = useMemo(() => {
    return filteredIndex.slice(0, displayCount);
  }, [filteredIndex, displayCount]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 150) {
        if (displayCount < filteredIndex.length) {
          setDisplayCount((prev) => Math.min(prev + 50, filteredIndex.length));
        }
      }
    },
    [displayCount, filteredIndex.length]
  );

  const handleSelectWordCallback = useCallback((id: number, word: string) => {
    setSelectedWord({ id, w: word });
  }, []);

  const handleJumpToLetter = (letter: string) => {
    setSearchQuery('');
    const target = indexItems.find((item) =>
      (item.w || '').toUpperCase().startsWith(letter)
    );
    if (target) {
      setSelectedWord({ id: target.id, w: target.w || '' });
      setDisplayCount(60);
      setTimeout(() => {
        const el = document.getElementById(`word-item-${target.id}`);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 50);
    }
  };

  // بررسی وضعیت صدا و پخش یا نمایش اخطار
  const handlePlayAudio = (audioUrl?: string) => {
    if (!audioUrl) return;

    const isMasterSoundOn = state.settings.soundEnabled;
    const isSpeechOn = (state.settings as any).lexiconSpeechEnabled ?? true;

    if (!isMasterSoundOn || !isSpeechOn) {
      showToast('Sound is muted. Enable it in Settings to hear pronunciation.', 'warning');
      return;
    }

    const volume = (state.settings as any).lexiconVolume ?? 0.8;
    (oxfordService as any).playOfflineAudio(audioUrl, volume);
  };

  // عملیات دوطرفه فلش‌کارت
  const handleToggleFlashcard = (detail: OxfordWordDetail) => {
    const word = detail.word || '';
    const isAlreadyInCards = flashcardWordSet.has(word.toLowerCase());

    if (isAlreadyInCards) {
      if (onRemoveFromFlashcards) {
        onRemoveFromFlashcards(word);
      }
    } else {
      const firstSense = detail.senses?.[0];
      const example = firstSense?.examples?.[0];

      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

      const promptText = example
        ? example.replace(regex, '[ ... ]')
        : `Define the word: "${firstSense?.definition || word}" [ ... ]`;

      const newCard: Flashcard = {
        id: `card-ox-${detail.id}-${Date.now().toString(36)}`,
        prompt: promptText,
        targetPhrase: word,
        persianHint: customPersianNote.trim() || firstSense?.definition || '',
        sourceBookId: 'Oxford 5000',
        interval: 1,
        repetition: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString().split('T')[0],
        lapses: 0,
        skillTag: detail.academic_tags?.length > 0 ? 'Academic Vocabulary' : 'Advanced Vocabulary',
        createdAt: new Date().toISOString(),
        audioUk: detail.audio?.uk,
        audioUs: detail.audio?.us,
      };

      onPushToFlashcards(newCard);
    }
  };

  const getLevelBadgeVariant = (lvl: string): 'rose' | 'mint' | 'lavender' | 'indigo' | 'cream' => {
    const l = (lvl || '').toUpperCase();
    if (l === 'A1' || l === 'A2') return 'rose';
    if (l === 'B1') return 'cream';
    if (l === 'B2') return 'lavender';
    return 'indigo';
  };

  const isCurrentWordInCards = activeWordDetail
    ? flashcardWordSet.has((activeWordDetail.word || '').toLowerCase())
    : false;

  const isLightbulbActive = Boolean(customPersianNote) || showNoteInput;

  return (
    <div className="space-y-4 pb-8">
      {/* ۱. نوار ابزار و فیلترهای بالا */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-3.5 neo-shadow flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-[#312E81]" />
          <span className="text-base font-black text-black">Oxford 5000 Lexicon</span>
          <span className="text-[10px] font-mono font-bold bg-black/5 px-2 py-0.5 rounded-md border border-black/10 text-black/60">
            5,906 Words • Offline
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyAcademic(!onlyAcademic)}
            className={`px-3 py-1 rounded-xl border-2 border-black text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              onlyAcademic
                ? 'bg-[#312E81] text-white shadow-[2px_2px_0px_0px_#000]'
                : 'bg-white text-black hover:bg-black/5 shadow-[2px_2px_0px_0px_#000]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>OPAL Academic</span>
          </button>

          <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl border-2 border-black/10">
            {['all', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                  selectedLevel === lvl
                    ? 'bg-black text-white shadow-[1px_1px_0px_0px_#000]'
                    : 'bg-transparent text-black hover:bg-black/10'
                }`}
              >
                {lvl.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ۲. ساختار دو ستونه */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[580px]">
        {/* ستون سمت چپ: ایندکس کلمات و سرچ */}
        <div className="md:col-span-5 lg:col-span-4 bg-[#FFFDF5] border-2 border-black rounded-3xl p-4 neo-shadow flex flex-col h-full overflow-hidden">
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-black/20 focus:border-black rounded-xl pl-9 pr-8 py-2 text-xs text-black font-semibold focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-black/40 hover:text-black cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-1 mb-2 border-b border-black/10 text-[10px] font-mono font-bold text-black/60">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handleJumpToLetter(letter)}
                className="px-1 hover:text-[#312E81] hover:scale-125 transition-transform cursor-pointer"
              >
                {letter}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-mono font-bold text-black/40 pb-1.5 flex justify-between">
            <span>ENTRIES</span>
            <span>{filteredIndex.length}</span>
          </div>

          <div
            ref={listContainerRef}
            onScroll={handleListScroll}
            className="flex-1 overflow-y-auto space-y-1.5 pr-1"
          >
            {isLoading ? (
              <div className="text-center py-16 font-mono text-xs text-black/50 animate-pulse">
                Loading Index...
              </div>
            ) : filteredIndex.length === 0 ? (
              <div className="text-center py-16 font-mono text-xs text-black/40">
                No matching words found.
              </div>
            ) : (
              visibleItems.map((item) => (
                <WordListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedWord?.id === item.id}
                  inCards={flashcardWordSet.has((item.w || '').toLowerCase())}
                  onSelect={handleSelectWordCallback}
                />
              ))
            )}
          </div>
        </div>

        {/* ستون سمت راست: مدخل دیکشنری */}
        <div className="md:col-span-7 lg:col-span-8 bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 sm:p-8 neo-shadow flex flex-col h-full overflow-y-auto">
          {loadingDetail ? (
            <div className="m-auto font-mono text-xs text-black/50 animate-pulse">
              Loading entry...
            </div>
          ) : !activeWordDetail ? (
            <div className="m-auto text-center font-mono text-xs text-black/40">
              Select any word from the left list to read its entry.
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl">
              {/* هدر مدخل واژه + دکمه لامپ با پاپ‌اور شناور بسته شونده خودکار + دکمه فلش‌کارت */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-black/10">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h2 className="text-4xl font-black text-black tracking-tight font-serif">
                      {activeWordDetail.word}
                    </h2>
                    <span className="text-sm italic font-serif text-black/60">
                      {activeWordDetail.pos}
                    </span>
                    <Badge variant={getLevelBadgeVariant(activeWordDetail.cefr)} size="sm">
                      {activeWordDetail.cefr}
                    </Badge>
                  </div>

                  {/* تلفظ‌های صوتی به همراه بررسی قطع نبودن صدا */}
                  <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                    {activeWordDetail.audio?.uk && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(activeWordDetail.audio?.uk)}
                        className="px-2.5 py-1 rounded-xl border-2 border-black bg-[#E0E7FF] hover:bg-[#C7D2FE] text-[#312E81] font-bold shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Play UK Audio"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#312E81]" />
                        <span>UK {activeWordDetail.phonetics?.uk}</span>
                      </button>
                    )}

                    {activeWordDetail.audio?.us && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(activeWordDetail.audio?.us)}
                        className="px-2.5 py-1 rounded-xl border-2 border-black bg-[#FFE0B2] hover:bg-[#FFCC80] text-amber-900 font-bold shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Play US Audio"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-900" />
                        <span>US {activeWordDetail.phonetics?.us}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ابزارهای گوشه: لامپ هینت شناور + دکمه فلش‌کارت دوطرفه */}
                <div className="flex items-center gap-2">
                  {/* محفظه هینت شناور با تشخیص کلیک در بیرون (Outside Click) */}
                  <div className="relative" ref={noteContainerRef}>
                    <button
                      type="button"
                      onClick={() => setShowNoteInput(!showNoteInput)}
                      className={`h-9 w-9 rounded-xl border-2 border-black flex items-center justify-center cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#000] ${
                        isLightbulbActive
                          ? 'bg-[#FFF3C4] text-amber-900'
                          : 'bg-white hover:bg-black/5 text-black/40'
                      }`}
                      title={customPersianNote ? `معنی: ${customPersianNote}` : 'افزودن یادداشت / معنی فارسی'}
                    >
                      <Lightbulb
                        className={`w-4 h-4 transition-transform ${
                          isLightbulbActive
                            ? 'fill-amber-400 text-amber-700 scale-110'
                            : 'text-black/50'
                        }`}
                      />
                    </button>

                    {/* کادر شناور پاپ‌اور با فونت تضمین‌شده وزیرمتن */}
                    {showNoteInput && (
                      <div
                        dir="auto"
                        className="absolute right-0 top-11 z-40 w-72 bg-[#FFFDF5] border-2 border-black rounded-2xl p-2.5 shadow-[3px_3px_0px_0px_#000] animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="relative">
                          <input
                            type="text"
                            dir="rtl"
                            autoFocus
                            placeholder="معنی فارسی یا یادداشت را بنویسید..."
                            value={customPersianNote}
                            onChange={(e) => handleNoteChange(e.target.value)}
                            style={{ fontFamily: "'Vazirmatn', sans-serif" }}
                            className="w-full bg-white border-2 border-black rounded-xl pr-3 pl-8 py-1.5 text-xs font-vazir font-bold text-black focus:outline-none"
                          />
                          {customPersianNote && (
                            <button
                              type="button"
                              onClick={() => handleNoteChange('')}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-black/30 hover:text-black/70 p-0.5 cursor-pointer"
                              title="پاک کردن متن"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* دکمه فلش‌کارت با عرض ثابت بدون پرش و بدون ضربدر اضافه */}
                  <button
                    type="button"
                    onClick={() => handleToggleFlashcard(activeWordDetail)}
                    className={`h-9 w-44 rounded-xl border-2 border-black text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#000] ${
                      isCurrentWordInCards
                        ? 'bg-[#C8E6C9] hover:bg-[#FFCDD2] text-emerald-950 hover:text-rose-950 group'
                        : 'bg-[#C8E6C9] hover:bg-[#A5D6A7] text-black'
                    }`}
                    title={isCurrentWordInCards ? 'Click to remove from flashcards' : 'Click to add to flashcards'}
                  >
                    {isCurrentWordInCards ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3] text-emerald-700 group-hover:hidden shrink-0" />
                        <span className="group-hover:hidden">In Flashcards ✓</span>
                        <X className="w-4 h-4 stroke-[3] text-rose-700 hidden group-hover:inline shrink-0" />
                        <span className="hidden group-hover:inline text-rose-950">Remove</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4 text-black shrink-0" />
                        <span>+ Add to Flashcards</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* صرف افعال به صورت تاشو */}
              {activeWordDetail.verb_forms && activeWordDetail.verb_forms.length > 0 && (
                <div className="border-2 border-black/15 rounded-xl p-2.5 bg-black/2 shadow-[1px_1px_0px_0px_#000]">
                  <button
                    type="button"
                    onClick={() => setShowVerbForms(!showVerbForms)}
                    className="w-full flex items-center justify-between text-xs font-mono font-bold text-black/60 cursor-pointer active:translate-x-0.5"
                  >
                    <span>Verb Forms ({activeWordDetail.verb_forms.length})</span>
                    {showVerbForms ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showVerbForms && (
                    <div className="mt-2 pt-2 border-t border-black/10 space-y-1 font-mono text-[11px] text-black/70">
                      {activeWordDetail.verb_forms.map((vf, idx) => (
                        <div key={idx}>• {vf}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* بخش تعاریف واژه با اولویت بصری دقیق الگوها */}
              <div className="space-y-6 pt-1">
                {activeWordDetail.senses?.map((sense, sIdx) => (
                  <div key={sIdx} className="space-y-2 group">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-mono font-bold text-[#312E81] text-base">
                        {sIdx + 1}.
                      </span>

                      {sense.grammar && (
                        <span className="text-xs font-mono text-slate-500 font-normal">
                          {sense.grammar}
                        </span>
                      )}

                      {sense.patterns && sense.patterns.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {sense.patterns.map((pat, pIdx) => (
                            <span
                              key={pIdx}
                              className="text-xs font-sans font-bold text-black bg-[#FFF3C4] border-2 border-black/40 px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_#000]"
                            >
                              {pat}
                            </span>
                          ))}
                        </div>
                      )}

                      {sense.cefr && (
                        <Badge variant={getLevelBadgeVariant(sense.cefr)} size="sm">
                          {sense.cefr}
                        </Badge>
                      )}
                    </div>

                    <div className="text-[15px] sm:text-base font-bold text-slate-900 leading-snug pl-5 font-sans">
                      {sense.definition}
                    </div>

                    {sense.examples && sense.examples.length > 0 && (
                      <div className="pl-5 space-y-1.5 pt-1">
                        {sense.examples.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="text-[13.5px] italic text-slate-700 pl-3 border-l-2 border-[#312E81]/40 leading-relaxed font-serif"
                          >
                            "{ex}"
                          </div>
                        ))}
                      </div>
                    )}

                    {sense.collocations && sense.collocations.length > 0 && (
                      <div className="pl-5 pt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Collocations:
                        </span>
                        {sense.collocations.map((col, cIdx) => (
                          <span
                            key={cIdx}
                            className="font-mono text-[11px] bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-800 shadow-2xs"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LexiconView;