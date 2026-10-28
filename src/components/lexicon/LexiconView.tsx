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
  ArrowLeft,
  Plus,
  Sparkles,
  History,
} from 'lucide-react';
import { SearchIndexItem, OxfordWordDetail, SenseItem } from '../../types/oxford';
import { AppState, Flashcard } from '../../types';
import * as oxfordService from '../../services/oxfordService';
import { showToast } from '../../services/notification';
import { Badge } from '../common/Badge';
import {
  buildOxfordFlashcardPrompt,
  buildOxfordIdiomFlashcard,
  buildOxfordCollocationFlashcard,
  getCollocationChunkTitle,
  buildSentenceClozeFlashcard,
} from '../../utils/cloze';
import { getTodayDateString } from '../../utils/date';

export interface LexiconViewProps {
  state: AppState;
  onPushToFlashcards: (card: Flashcard) => void;
  onRemoveFromFlashcards?: (targetPhrase: string) => void;
  initialSearchQuery?: string;
  onAddWord?: (word: any) => void;
  onDeleteWord?: (id: string) => void;
  onSaveNote?: (word: string, note: string) => void;
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
  onSaveNote,
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

  // وضعیت ناوبری موبایل بین فهرست و صفحه جزئیات
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // وضعیت نمایش کادر شناور یادداشت/ترجمه
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);
  const noteContainerRef = useRef<HTMLDivElement | null>(null);

  const [showVerbForms, setShowVerbForms] = useState<boolean>(false);

  // وضعیت باز و بسته بودن بخش‌های کرکره‌ای آکسفورد (Accordions) - پیش‌فرض همه بسته
  const [expandedExtraExamples, setExpandedExtraExamples] = useState<Record<number, boolean>>({});
  const [expandedCollocations, setExpandedCollocations] = useState<Record<number, boolean>>({});
  const [showSynonymStudy, setShowSynonymStudy] = useState<boolean>(false);
  const [showWordOrigin, setShowWordOrigin] = useState<boolean>(false);

  const toggleExtraExamples = (sIdx: number) => {
    setExpandedExtraExamples((prev) => ({ ...prev, [sIdx]: !prev[sIdx] }));
  };

  const toggleCollocations = (sIdx: number) => {
    setExpandedCollocations((prev) => ({ ...prev, [sIdx]: !prev[sIdx] }));
  };

  const [displayCount, setDisplayCount] = useState<number>(60);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const lastSelectedQueryRef = useRef<string>('');

  const [customPersianNote, setCustomPersianNote] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>(() => {
    try {
      const local = JSON.parse(localStorage.getItem('oxford_persian_notes') || '{}');
      return { ...local, ...(state.lexiconNotes || {}) };
    } catch {
      return { ...(state.lexiconNotes || {}) };
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
      setShowVerbForms(false);
      setShowSynonymStudy(false);
      setShowWordOrigin(false);
      setExpandedExtraExamples({});
      setExpandedCollocations({});
      oxfordService.getWordDetailById(selectedWord.id).then((detail: OxfordWordDetail | null) => {
        setActiveWordDetail(detail);
        if (detail && detail.word) {
          const w = detail.word.toLowerCase();
          setCustomPersianNote(state.lexiconNotes?.[w] ?? savedNotes[w] ?? '');
        }
        setLoadingDetail(false);
      }).catch(() => {
        setLoadingDetail(false);
      });
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
      const wordKey = activeWordDetail.word.toLowerCase();
      const updated = { ...savedNotes, [wordKey]: text };
      setSavedNotes(updated);
      onSaveNote?.(wordKey, text);
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
        setMobileView('detail');
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
    setMobileView('detail');
  }, []);

  const handleJumpToLetter = (letter: string) => {
    setSearchQuery('');

    // پیدا کردن اولین کلمه‌ای که با این حرف شروع می‌شود با لحاظ فیلترهای فعال
    const targetIndex = indexItems.findIndex((item) => {
      const itemLvl = (item.lvl || '').toUpperCase();
      if (selectedLevel !== 'all' && itemLvl !== selectedLevel.toUpperCase()) {
        return false;
      }
      if (onlyAcademic && !item.tags?.includes('academic')) {
        return false;
      }
      return (item.w || '').toUpperCase().startsWith(letter);
    });

    if (targetIndex !== -1) {
      const target = indexItems[targetIndex];
      setSelectedWord({ id: target.id, w: target.w || '' });
      // گسترش محدوده رندر تا آیتم مورد نظر به همراه بافر کافی
      setDisplayCount((prev) => Math.max(prev, targetIndex + 100));

      setTimeout(() => {
        const el = document.getElementById(`word-item-${target.id}`);
        if (el && listContainerRef.current) {
          const containerTop = listContainerRef.current.getBoundingClientRect().top;
          const elTop = el.getBoundingClientRect().top;
          listContainerRef.current.scrollTo({
            top: listContainerRef.current.scrollTop + (elTop - containerTop) - 8,
            behavior: 'smooth',
          });
        } else if (el) {
          el.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }, 70);
    }
  };

  // پرش مستقیم به لغت دیگر با کلیک روی مترادف یا متضاد
  const handleSelectWordByName = (targetName: string) => {
    if (!targetName) return;
    const clean = targetName.trim().toLowerCase();
    setSearchQuery(clean);
    setMobileView('detail');

    const found =
      indexItems.find((it) => (it.w || '').toLowerCase() === clean) ||
      indexItems.find((it) => (it.w || '').toLowerCase().startsWith(clean));

    if (found) {
      setSelectedWord({ id: found.id, w: found.w || '' });
      if (listContainerRef.current) {
        setTimeout(() => {
          const el = document.getElementById(`word-item-${found.id}`);
          if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 80);
      }
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
      const promptText = buildOxfordFlashcardPrompt(detail);
      const wordKey = (detail.word || '').toLowerCase();
      const hintText = customPersianNote.trim() || savedNotes[wordKey]?.trim() || '';

      const newCard: Flashcard = {
        id: `card-ox-${detail.id}-${Date.now().toString(36)}`,
        prompt: promptText,
        targetPhrase: word,
        persianHint: hintText,
        sourceBookId: 'Oxford 5000',
        interval: 1,
        repetition: 0,
        easeFactor: 2.5,
        stability: 0,
        difficulty: 0,
        state: 0,
        dueDate: getTodayDateString(),
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
    <div className="space-y-3 sm:space-y-4 pb-8">
      {/* ۱. نوار ابزار و فیلترهای بالا */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 neo-shadow flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center justify-between md:justify-start gap-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#312E81] shrink-0" />
            <span className="text-sm sm:text-base font-black text-black">Oxford 5000 Lexicon</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-black/5 px-2 py-0.5 rounded-md border border-black/10 text-black/60 shrink-0">
            5,906 Words • Offline
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => setOnlyAcademic(!onlyAcademic)}
            className={`px-2.5 sm:px-3 py-1 rounded-xl border-2 border-black text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 ${
              onlyAcademic
                ? 'bg-[#312E81] text-white shadow-[1.5px_1.5px_0px_0px_#000]'
                : 'bg-white text-black hover:bg-black/5 shadow-[1.5px_1.5px_0px_0px_#000]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>OPAL Academic</span>
          </button>

          <div className="flex items-center gap-0.5 sm:gap-1 bg-black/5 p-1 rounded-xl border-2 border-black/10 overflow-x-auto">
            {['all', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 shrink-0 ${
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

      {/* ۲. ساختار دو ستونه تطبیق‌پذیر */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 h-[calc(100dvh-175px)] md:h-[calc(100vh-210px)] min-h-[500px]">
        
        {/* ستون سمت چپ: ایندکس کلمات و سرچ (در موبایل هنگام مشاهده جزئیات پنهان می‌شود) */}
        <div
          className={`md:col-span-5 lg:col-span-4 bg-[#FFFDF5] border-2 border-black rounded-2xl sm:rounded-3xl p-3 sm:p-4 neo-shadow flex-col h-full overflow-hidden ${
            mobileView === 'detail' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="relative mb-2 shrink-0">
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

          <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-1 mb-2 border-b border-black/10 text-[10px] font-mono font-bold text-black/60 shrink-0">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handleJumpToLetter(letter)}
                className="px-1 min-w-[16px] text-center hover:text-[#312E81] hover:scale-125 transition-transform cursor-pointer"
              >
                {letter}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-mono font-bold text-black/40 pb-1.5 flex justify-between shrink-0">
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

        {/* ستون سمت راست: مدخل دیکشنری (در موبایل تنها پس از انتخاب واژه نمایش می‌یابد) */}
        <div
          className={`md:col-span-7 lg:col-span-8 bg-[#FFFDF5] border-2 border-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 neo-shadow flex-col h-full overflow-y-auto ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* دکمه بازگشت به فهرست لغات مخصوص نمایش در موبایل */}
          <div className="md:hidden flex items-center justify-between pb-3 mb-2 border-b border-black/10 shrink-0">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black bg-white hover:bg-black/5 text-xs font-mono font-bold shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Word List ({filteredIndex.length})</span>
            </button>
            <span className="text-[11px] font-mono text-black/50 font-bold">
              {activeWordDetail?.word || selectedWord?.w || ''}
            </span>
          </div>

          {loadingDetail ? (
            <div className="m-auto font-mono text-xs text-black/50 animate-pulse">
              Loading entry...
            </div>
          ) : !activeWordDetail ? (
            <div className="m-auto text-center font-mono text-xs text-black/40">
              Select any word from the list to read its entry.
            </div>
          ) : (
            <div className="space-y-5 sm:space-y-6 max-w-3xl">
              {/* هدر مدخل واژه + تلفظ + دکمه‌ها */}
              <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 pb-4 border-b border-black/10">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
                    <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight font-serif break-words">
                      {activeWordDetail.word}
                    </h2>
                    <span className="text-sm italic font-serif text-black/60">
                      {activeWordDetail.pos}
                    </span>
                    <Badge variant={getLevelBadgeVariant(activeWordDetail.cefr)} size="sm">
                      {activeWordDetail.cefr}
                    </Badge>
                  </div>

                  {/* تلفظ‌های صوتی */}
                  <div className="flex items-center gap-2 sm:gap-3 pt-1 text-xs font-mono flex-wrap">
                    {activeWordDetail.audio?.uk && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(activeWordDetail.audio?.uk)}
                        className="px-2.5 py-1 rounded-xl border-2 border-black bg-[#E0E7FF] hover:bg-[#C7D2FE] text-[#312E81] font-bold shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Play UK Audio"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#312E81] shrink-0" />
                        <span>UK {activeWordDetail.phonetics?.uk}</span>
                      </button>
                    )}

                    {activeWordDetail.audio?.us && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(activeWordDetail.audio?.us)}
                        className="px-2.5 py-1 rounded-xl border-2 border-black bg-[#FFE0B2] hover:bg-[#FFCC80] text-amber-900 font-bold shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Play US Audio"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-900 shrink-0" />
                        <span>US {activeWordDetail.phonetics?.us}</span>
                      </button>
                    )}
                  </div>

                  {/* مترادف‌ها و متضادهای سطح واژه - همگی لینک‌های کلیک‌پذیر */}
                  {((activeWordDetail.synonyms && activeWordDetail.synonyms.length > 0) ||
                    (activeWordDetail.opposites && activeWordDetail.opposites.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {activeWordDetail.synonyms && activeWordDetail.synonyms.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-[#C8E6C9] border border-black/20 rounded-lg px-2.5 py-1 font-mono flex-wrap">
                          <span className="font-bold text-emerald-950">SYN:</span>
                          {activeWordDetail.synonyms.map((syn, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-emerald-700/60 font-sans">,</span>}
                              <button
                                type="button"
                                onClick={() => handleSelectWordByName(syn)}
                                className="font-bold text-emerald-950 hover:text-emerald-700 underline decoration-emerald-500 hover:decoration-emerald-800 underline-offset-2 cursor-pointer transition-colors"
                                title={`Jump to ${syn}`}
                              >
                                {syn}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      {activeWordDetail.opposites && activeWordDetail.opposites.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-[#FFCDD2] border border-black/20 rounded-lg px-2.5 py-1 font-mono flex-wrap">
                          <span className="font-bold text-rose-950">OPP:</span>
                          {activeWordDetail.opposites.map((opp, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-rose-700/60 font-sans">,</span>}
                              <button
                                type="button"
                                onClick={() => handleSelectWordByName(opp)}
                                className="font-bold text-rose-950 hover:text-rose-700 underline decoration-rose-500 hover:decoration-rose-800 underline-offset-2 cursor-pointer transition-colors"
                                title={`Jump to ${opp}`}
                              >
                                {opp}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ابزارهای گوشه: لامپ هینت شناور + دکمه فلش‌کارت */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* محفظه هینت شناور با تشخیص کلیک در بیرون */}
                  <div className="relative" ref={noteContainerRef}>
                    <button
                      type="button"
                      onClick={() => setShowNoteInput(!showNoteInput)}
                      className={`h-9 w-9 rounded-xl border-2 border-black flex items-center justify-center cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-[1.5px_1.5px_0px_0px_#000] ${
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

                    {/* کادر شناور پاپ‌اور ترجمه سازگار با عرض موبایل */}
                    {showNoteInput && (
                      <div
                        dir="auto"
                        className="absolute right-0 top-11 z-40 w-[calc(100vw-3rem)] max-w-xs sm:w-72 bg-[#FFFDF5] border-2 border-black rounded-2xl p-2.5 shadow-[3px_3px_0px_0px_#000] animate-in fade-in zoom-in-95 duration-100"
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

                  {/* دکمه فلش‌کارت */}
                  <button
                    type="button"
                    onClick={() => handleToggleFlashcard(activeWordDetail)}
                    className={`h-9 px-3 sm:w-44 rounded-xl border-2 border-black text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:translate-x-0.5 active:translate-y-0.5 shadow-[1.5px_1.5px_0px_0px_#000] ${
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
                        <span>+ Add to Cards</span>
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

              {/* جعبه جامع بررسی مترادف‌ها (Synonym Study Box - همانند وب‌سایت آکسفورد) */}
              {activeWordDetail.synonym_study && (
                <div className="rounded-2xl border-2 border-orange-300 bg-[#FFF9F2] p-4 sm:p-5 neo-shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-[#EA580C] rounded-full shrink-0" />
                      <span className="font-mono font-black text-xs uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-orange-600" />
                        Synonyms Study
                      </span>
                      {activeWordDetail.synonym_study.words && activeWordDetail.synonym_study.words.length > 0 && (
                        <span className="font-mono text-xs font-bold text-orange-900 inline-flex items-center gap-1 flex-wrap">
                          <span>(</span>
                          {activeWordDetail.synonym_study.words.map((w, wIdx) => (
                            <React.Fragment key={wIdx}>
                              {wIdx > 0 && <span className="text-orange-400 font-normal">▪</span>}
                              <button
                                type="button"
                                onClick={() => handleSelectWordByName(w)}
                                className="text-orange-900 hover:text-orange-950 underline decoration-orange-400 hover:decoration-orange-800 underline-offset-2 cursor-pointer transition-colors"
                                title={`Jump to definition of ${w}`}
                              >
                                {w}
                              </button>
                            </React.Fragment>
                          ))}
                          <span>)</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSynonymStudy(!showSynonymStudy)}
                      className="text-orange-950 hover:text-black font-mono text-xs font-bold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-orange-300 shadow-2xs"
                    >
                      <span>{showSynonymStudy ? 'Collapse' : 'Expand'}</span>
                      {showSynonymStudy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {activeWordDetail.synonym_study.overview && (
                    <p className="text-xs text-orange-950/80 leading-relaxed font-sans">
                      {activeWordDetail.synonym_study.overview}
                    </p>
                  )}

                  {showSynonymStudy && (
                    <div className="space-y-3 pt-3 border-t border-orange-200 text-xs animate-in fade-in duration-150">
                      {/* تفکیک کلمات با مثال‌ها */}
                      <div className="grid grid-cols-1 gap-2.5">
                        {activeWordDetail.synonym_study.items?.map((item, itmIdx) => (
                          <div key={itmIdx} className="pl-3 border-l-2 border-orange-400 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleSelectWordByName(item.word)}
                              className="font-bold text-orange-950 hover:text-black font-sans text-xs underline decoration-orange-400 hover:decoration-orange-800 underline-offset-2 cursor-pointer transition-colors text-left"
                              title={`Jump to definition of ${item.word}`}
                            >
                              {item.word}
                            </button>
                            {item.examples?.map((ex, exIdx) => (
                              <p key={exIdx} className="text-[11.5px] italic text-slate-700 font-serif">
                                • {ex}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Which word? نکته تمایز معنایی */}
                      {activeWordDetail.synonym_study.which_word && (
                        <div className="bg-white p-3 rounded-xl border border-orange-200 space-y-1">
                          <span className="font-bold text-orange-950 text-xs block font-mono uppercase">
                            Which Word?
                          </span>
                          <p className="text-xs text-slate-800 leading-relaxed font-sans">
                            {activeWordDetail.synonym_study.which_word}
                          </p>
                        </div>
                      )}

                      {/* Patterns الگوهای گرامری */}
                      {activeWordDetail.synonym_study.patterns && activeWordDetail.synonym_study.patterns.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-mono text-[11px] font-bold text-orange-900 uppercase">
                            Patterns:
                          </span>
                          <ul className="space-y-1">
                            {activeWordDetail.synonym_study.patterns.map((pat, pIdx) => (
                              <li key={pIdx} className="text-xs font-mono text-orange-950 bg-white px-2 py-0.5 rounded border border-orange-100">
                                • {pat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* بخش تعاریف واژه با اولویت بصری دقیق الگوها */}
              <div className="space-y-5 pt-1">
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

                    <div className="text-[14.5px] sm:text-base font-bold text-slate-900 leading-snug pl-4 sm:pl-5 font-sans">
                      {sense.definition}
                    </div>

                    {sense.examples && sense.examples.length > 0 && (
                      <div className="pl-4 sm:pl-5 space-y-1.5 pt-1">
                        {sense.examples.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="group flex items-start justify-between gap-2 text-[13px] sm:text-[13.5px] italic text-slate-700 pl-3 border-l-2 border-[#312E81]/40 leading-relaxed font-serif bg-slate-50/50 hover:bg-slate-50 p-1.5 rounded-r-xl transition-colors"
                          >
                            <span className="flex-1">"{ex}"</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!activeWordDetail) return;
                                const card = buildSentenceClozeFlashcard(
                                  ex,
                                  activeWordDetail.word,
                                  sense.definition,
                                  activeWordDetail.verb_forms,
                                  activeWordDetail.audio,
                                  customPersianNote,
                                  exIdx
                                );
                                onPushToFlashcards(card);
                                showToast(`Sentence mined to Flashcards!`, 'success');
                              }}
                              className="opacity-0 group-hover:opacity-100 sm:opacity-50 hover:opacity-100 p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#312E81] border border-indigo-200 transition-all cursor-pointer shrink-0 shadow-2xs"
                              title="Mine sentence into a Cloze Flashcard"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* دکمه کرکره‌ای مثال‌های بیشتر (Extra Examples) */}
                    {sense.extra_examples && sense.extra_examples.length > 0 && (
                      <div className="pl-4 sm:pl-5 pt-1">
                        <button
                          type="button"
                          onClick={() => toggleExtraExamples(sIdx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-300 bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] font-mono text-xs font-bold cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-2xs"
                        >
                          {expandedExtraExamples[sIdx] ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>Extra Examples ({sense.extra_examples.length})</span>
                        </button>
                        {expandedExtraExamples[sIdx] && (
                          <ul className="mt-2 space-y-1.5 pl-3 border-l-2 border-orange-400 bg-orange-50/40 p-3 rounded-r-xl animate-in fade-in duration-150">
                            {sense.extra_examples.map((ee, eeIdx) => (
                              <li key={eeIdx} className="group flex items-start justify-between gap-2 text-xs italic text-slate-800 leading-relaxed font-serif hover:bg-orange-100/50 p-1 rounded transition-colors">
                                <span className="flex-1">• "{ee}"</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!activeWordDetail) return;
                                    const card = buildSentenceClozeFlashcard(
                                      ee,
                                      activeWordDetail.word,
                                      sense.definition,
                                      activeWordDetail.verb_forms,
                                      activeWordDetail.audio,
                                      customPersianNote,
                                      eeIdx
                                    );
                                    onPushToFlashcards(card);
                                    showToast(`Extra example mined to Flashcards!`, 'success');
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded bg-orange-100 hover:bg-orange-200 text-[#C2410C] border border-orange-300 transition-all cursor-pointer shrink-0 shadow-2xs"
                                  title="Mine extra example into a Cloze Flashcard"
                                >
                                  <Sparkles className="w-3 h-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* دکمه کرکره‌ای دیکشنری کالوکیشن‌ها (Oxford Collocations Dictionary) */}
                    {((sense.collocations_grouped && sense.collocations_grouped.length > 0) || (sense.collocations && sense.collocations.length > 0)) && (
                      <div className="pl-4 sm:pl-5 pt-1">
                        <button
                          type="button"
                          onClick={() => toggleCollocations(sIdx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-300 bg-[#FAF5FF] hover:bg-[#F3E8FF] text-[#7E22CE] font-mono text-xs font-bold cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-2xs"
                        >
                          {expandedCollocations[sIdx] ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>Oxford Collocations Dictionary</span>
                        </button>
                        {expandedCollocations[sIdx] && (
                          <div className="mt-2 p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2.5 text-xs animate-in fade-in duration-150">
                            {sense.collocations_grouped && sense.collocations_grouped.length > 0 ? (
                              sense.collocations_grouped.map((cg, cgIdx) => (
                                <div key={cgIdx} className="space-y-1">
                                  <span className="font-mono text-[11px] font-bold text-purple-900 uppercase tracking-wide">
                                    {cg.category}:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {cg.items.map((item, itmIdx) => {
                                      const chunkTitle = activeWordDetail ? getCollocationChunkTitle(item, activeWordDetail.word) : item;
                                      const isMined = flashcardWordSet.has(item.trim().toLowerCase()) || flashcardWordSet.has(chunkTitle.toLowerCase());
                                      return (
                                        <button
                                          key={itmIdx}
                                          type="button"
                                          onClick={() => {
                                            if (!activeWordDetail) return;
                                            const card = buildOxfordCollocationFlashcard(
                                              item,
                                              activeWordDetail,
                                              sIdx,
                                              customPersianNote,
                                              itmIdx
                                            );
                                            onPushToFlashcards(card);
                                            showToast(`Collocation "${card.targetPhrase}" added to Flashcards!`, 'success');
                                          }}
                                          className={`group inline-flex items-center gap-1 border font-mono text-[11px] font-semibold px-2 py-0.5 rounded shadow-2xs transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer ${
                                            isMined
                                              ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold'
                                              : 'bg-white hover:bg-purple-100 border-purple-200 text-purple-900'
                                          }`}
                                          title={isMined ? 'Already in flashcards (click to add again)' : `Click to add Collocation Flashcard ("${chunkTitle}")`}
                                        >
                                          <span>{item}</span>
                                          {isMined ? (
                                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                          ) : (
                                            <Plus className="w-3 h-3 text-purple-500 opacity-60 group-hover:opacity-100" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {sense.collocations?.map((col, cIdx) => {
                                  const chunkTitle = activeWordDetail ? getCollocationChunkTitle(col, activeWordDetail.word) : col;
                                  const isMined = flashcardWordSet.has(col.trim().toLowerCase()) || flashcardWordSet.has(chunkTitle.toLowerCase());
                                  return (
                                    <button
                                      key={cIdx}
                                      type="button"
                                      onClick={() => {
                                        if (!activeWordDetail) return;
                                        const card = buildOxfordCollocationFlashcard(
                                          col,
                                          activeWordDetail,
                                          sIdx,
                                          customPersianNote,
                                          cIdx
                                        );
                                        onPushToFlashcards(card);
                                        showToast(`Collocation "${card.targetPhrase}" added to Flashcards!`, 'success');
                                      }}
                                      className={`group inline-flex items-center gap-1 border font-mono text-[11px] font-semibold px-2 py-0.5 rounded shadow-2xs transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer ${
                                        isMined
                                          ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold'
                                          : 'bg-white hover:bg-purple-100 border-slate-300 text-slate-800'
                                      }`}
                                      title={isMined ? 'Already in flashcards (click to add again)' : `Click to add Collocation Flashcard ("${chunkTitle}")`}
                                    >
                                      <span>{col}</span>
                                      {isMined ? (
                                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                      ) : (
                                        <Plus className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* مترادف‌ها و متضادهای این معنی (Sense) */}
                    {((sense.synonyms && sense.synonyms.length > 0) ||
                      (sense.opposites && sense.opposites.length > 0)) && (
                      <div className="pl-4 sm:pl-5 pt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        {sense.synonyms && sense.synonyms.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-emerald-800 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                              SYN:
                            </span>
                            {sense.synonyms.map((syn, synIdx) => (
                              <React.Fragment key={synIdx}>
                                {synIdx > 0 && <span className="text-slate-400 text-xs">,</span>}
                                <button
                                  type="button"
                                  onClick={() => handleSelectWordByName(syn)}
                                  className="font-mono text-[11px] text-emerald-950 font-bold underline decoration-emerald-400 hover:text-emerald-700 hover:decoration-emerald-700 underline-offset-2 cursor-pointer transition-colors"
                                  title={`Jump to ${syn}`}
                                >
                                  {syn}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                        {sense.opposites && sense.opposites.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-rose-800 uppercase bg-rose-100 px-1.5 py-0.5 rounded">
                              OPP:
                            </span>
                            {sense.opposites.map((opp, oppIdx) => (
                              <React.Fragment key={oppIdx}>
                                {oppIdx > 0 && <span className="text-slate-400 text-xs">,</span>}
                                <button
                                  type="button"
                                  onClick={() => handleSelectWordByName(opp)}
                                  className="font-mono text-[11px] text-rose-950 font-bold underline decoration-rose-400 hover:text-rose-700 hover:decoration-rose-700 underline-offset-2 cursor-pointer transition-colors"
                                  title={`Jump to ${opp}`}
                                >
                                  {opp}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* بخش اصطلاحات (Idioms) */}
              {activeWordDetail.idioms && activeWordDetail.idioms.length > 0 && (
                <div className="mt-6 pt-5 border-t-2 border-black/15">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 bg-[#0284C7] rounded-full" />
                    <h4 className="text-xs font-mono font-black text-black tracking-wider uppercase">
                      Idioms ({activeWordDetail.idioms.length})
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {activeWordDetail.idioms.map((idm, iIdx) => (
                      <div
                        key={iIdx}
                        className="p-3.5 rounded-2xl border-2 border-sky-300/80 bg-[#F0F9FF] hover:border-sky-500 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs sm:text-sm font-black text-sky-950">
                            {idm.phrase}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newCard = buildOxfordIdiomFlashcard(
                                idm,
                                activeWordDetail.word,
                                customPersianNote.trim() || savedNotes[(activeWordDetail.word || '').toLowerCase()] || '',
                                activeWordDetail.audio,
                                iIdx
                              );
                              onPushToFlashcards(newCard);
                              showToast(`Added idiom "${idm.phrase}" to Flashcards!`, 'success');
                            }}
                            className="w-7 h-7 rounded-lg border border-black/30 hover:border-black bg-white hover:bg-[#E0E7FF] text-[#312E81] flex items-center justify-center cursor-pointer shadow-2xs active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0"
                            title="Add idiom to flashcards"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {idm.definition && (
                          <p className="text-xs text-slate-800 font-sans mt-1 leading-relaxed">
                            {idm.definition}
                          </p>
                        )}

                        {idm.examples && idm.examples.length > 0 && (
                          <ul className="mt-2 space-y-1 pl-3 border-l-2 border-sky-400">
                            {idm.examples.map((ex, exIdx) => (
                              <li
                                key={exIdx}
                                className="text-[11px] font-sans italic text-slate-700 leading-normal"
                              >
                                "{ex}"
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* بخش ریشه‌شناسی واژه (Word Origin) */}
              {activeWordDetail.word_origin && (
                <div className="border-2 border-black/15 rounded-xl p-3 bg-black/2 shadow-[1px_1px_0px_0px_#000]">
                  <button
                    type="button"
                    onClick={() => setShowWordOrigin(!showWordOrigin)}
                    className="w-full flex items-center justify-between text-xs font-mono font-bold text-black/70 cursor-pointer active:translate-x-0.5"
                  >
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-black/50" />
                      Word Origin
                    </span>
                    {showWordOrigin ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showWordOrigin && (
                    <div className="mt-2 pt-2 border-t border-black/10 text-xs text-slate-700 font-serif leading-relaxed animate-in fade-in duration-150">
                      {activeWordDetail.word_origin}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LexiconView;