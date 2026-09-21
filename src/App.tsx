import { useState, useEffect } from 'react';
import { ToastContainer } from './components/common/ToastContainer';
import { showToast } from './services/notification';
import {
  AppState,
  Flashcard,
  MistakeEntry,
  SprintEntry,
  LexiconWord,
  TimerSession,
  UnitProgress,
  SystemSettings,
  CurriculumBook,
  CurriculumUnit,
} from './types';
import { loadAppState, saveAppState } from './services/storage';
import { playSound } from './services/audio';
import { INITIAL_STATE } from './data/seedData';
import { Navbar, TabKey } from './components/navigation/Navbar';
import { SmartFAB } from './components/navigation/SmartFAB';
import { TodayView } from './components/today/TodayView';
import { ScheduleView } from './components/schedule/ScheduleView';
import { CardsView } from './components/cards/CardsView';
import { LexiconView } from './components/lexicon/LexiconView';
import { MistakesView } from './components/mistakes/MistakesView';
import { StudioView } from './components/studio/StudioView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SprintsView } from './components/sprints/SprintsView';
import { LibraryView } from './components/library/LibraryView';
import { ReviewModal } from './components/cards/ReviewModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { CardEditorModal } from './components/cards/CardEditorModal';
import { MistakeModal } from './components/mistakes/MistakeModal';
import { LexiconModal } from './components/lexicon/LexiconModal';
import { UnitInspectorModal } from './components/library/UnitInspectorModal';
import { getBook, getPlanForDay } from './services/scheduler';

export function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [lexiconSearchQuery, setLexiconSearchQuery] = useState<string>('');

  // Global modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isAddMistakeModalOpen, setIsAddMistakeModalOpen] = useState(false);
  const [isAddLexiconModalOpen, setIsAddLexiconModalOpen] = useState(false);

  // Unit inspector modal
  const [inspectingBook, setInspectingBook] = useState<CurriculumBook | null>(null);
  const [inspectingUnit, setInspectingUnit] = useState<CurriculumUnit | null>(null);

  // ۱. بارگذاری اولیه و چک کردن تاریخ واقعی سیستم (Auto-Rollover)
  useEffect(() => {
    loadAppState().then((saved) => {
      let workingState = saved;
      const todayDateStr = new Date().toISOString().split('T')[0];
      const lastOpenDate = workingState.settings.lastOpenedDate;

      if (lastOpenDate && lastOpenDate !== todayDateStr) {
        const activeDay = workingState.settings.currentActiveDay || 1;
        const plan = getPlanForDay(activeDay);

        const isCompleted = plan.isConsolidation
          ? Boolean(workingState.consolidationRecords?.[plan.weekNumber]?.completed)
          : plan.slots.every((s) => Boolean(workingState.unitProgress[`${s.bookId}_${s.unit}`]?.completed));

        if (isCompleted && activeDay < 120) {
          workingState = {
            ...workingState,
            settings: {
              ...workingState.settings,
              currentActiveDay: activeDay + 1,
              lastOpenedDate: todayDateStr,
            },
          };
        } else {
          workingState = {
            ...workingState,
            settings: {
              ...workingState.settings,
              lastOpenedDate: todayDateStr,
            },
          };
        }
      } else if (!lastOpenDate) {
        workingState = {
          ...workingState,
          settings: {
            ...workingState.settings,
            lastOpenedDate: todayDateStr,
          },
        };
      }

      setState(workingState);
      if (workingState.settings?.currentActiveDay) {
        setSelectedDay(workingState.settings.currentActiveDay);
      }
      setIsHydrated(true);
    });
  }, []);

  // ۲. اتوسیو بلادرنگ
  useEffect(() => {
    if (!isHydrated) return;
    saveAppState(state);
  }, [state, isHydrated]);

  // شنونده سوییچ بین تب‌ها
  useEffect(() => {
    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: TabKey; query?: string }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
        if (customEvent.detail.tab === 'lexicon') {
          setLexiconSearchQuery(customEvent.detail.query || '');
        }
      }
    };

    window.addEventListener('switch-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-tab', handleSwitchTab);
  }, []);

  const handleUpdateSettings = (newSettings: Partial<SystemSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  };

  const handleToggleSound = () => {
    const next = !state.settings.soundEnabled;
    handleUpdateSettings({ soundEnabled: next });
    if (next) playSound('complete', true);
  };

  const handleShiftSchedule = () => {
    setState((prev) => {
      const nextShift = prev.settings.shiftedDays + 1;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          shiftedDays: nextShift,
        },
      };
    });
    playSound('complete', state.settings.soundEnabled);
    showToast('Schedule shifted +1 day forward.', 'info');
  };

  const handleUnshiftSchedule = () => {
    setState((prev) => {
      const nextShift = Math.max(0, prev.settings.shiftedDays - 1);
      return {
        ...prev,
        settings: {
          ...prev.settings,
          shiftedDays: nextShift,
        },
      };
    });
    playSound('complete', state.settings.soundEnabled);
    showToast('Schedule shift reverted.', 'info');
  };

  const handleRestoreState = (restoredState: AppState) => {
    setState(restoredState);
    setSelectedDay(restoredState.settings.currentActiveDay || 1);
  };

  const handleResetState = () => {
    setState(INITIAL_STATE);
    setSelectedDay(1);
    playSound('complete', true);
    showToast('Reset to demo state.', 'info');
  };

  // پاکسازی کامل بدون پنجره پیش‌فرض مرورگر
  const handleClearAllUserData = () => {
    setState((prev) => ({
      ...prev,
      flashcards: [],
      lexicon: [],
      mistakes: [],
      sprints: [],
      timerSessions: [],
      todayRitual: {},
      unitProgress: {},
      consolidationRecords: {},
    }));
    playSound('complete', true);
    showToast('All user data purged successfully.', 'info');
  };

  // ریست پیشرفت و تسک‌های روز فعال جاری
  const handleResetActiveDayProgress = () => {
    const activeDay = state.settings.currentActiveDay || 1;
    const currentPlan = getPlanForDay(activeDay);

    setState((prev) => {
      const updatedUnitProgress = { ...prev.unitProgress };
      currentPlan.slots.forEach((slot) => {
        const key = `${slot.bookId}_${slot.unit}`;
        if (updatedUnitProgress[key]) {
          updatedUnitProgress[key] = {
            ...updatedUnitProgress[key],
            completed: false,
            timeSpentSeconds: 0,
          };
        }
      });

      const updatedRitual = { ...prev.todayRitual };
      delete updatedRitual[activeDay];

      return {
        ...prev,
        unitProgress: updatedUnitProgress,
        todayRitual: updatedRitual,
      };
    });

    playSound('complete', state.settings.soundEnabled);
    showToast(`Day ${activeDay} progress has been reset.`, 'info');
  };

  const handleUpdateUnitProgress = (unitKey: string, updates: Partial<UnitProgress>) => {
    setState((prev) => {
      const existing = prev.unitProgress[unitKey] || {
        completed: false,
        timeSpentSeconds: 0,
        keyNotes: '',
      };
      return {
        ...prev,
        unitProgress: {
          ...prev.unitProgress,
          [unitKey]: { ...existing, ...updates },
        },
      };
    });
  };

  const handleCompleteUnit = (unitKey: string, timeSpentSeconds: number) => {
    setState((prev) => {
      const existing = prev.unitProgress[unitKey] || {
        completed: false,
        timeSpentSeconds: 0,
        keyNotes: '',
      };

      const updatedProgress: UnitProgress = {
        ...existing,
        completed: true,
        completedAt: new Date().toISOString(),
        timeSpentSeconds: (existing.timeSpentSeconds || 0) + timeSpentSeconds,
      };

      const timerSession: TimerSession = {
        id: `timer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        mode: 'input',
        skill: unitKey.startsWith('AAT')
          ? 'Speaking'
          : unitKey.startsWith('BGIU') || unitKey.startsWith('EGIU')
          ? 'Grammar'
          : 'Vocabulary',
        durationSeconds: timeSpentSeconds || 900,
        timestamp: new Date().toISOString(),
        note: `Completed ${unitKey.replace('_', ' Unit ')}`,
      };

      return {
        ...prev,
        unitProgress: {
          ...prev.unitProgress,
          [unitKey]: updatedProgress,
        },
        timerSessions: [timerSession, ...prev.timerSessions],
      };
    });

    playSound('complete', state.settings.soundEnabled);
  };

  const handleSaveCard = (card: Flashcard) => {
    const normalizedTarget = card.targetPhrase.trim().toLowerCase();
    const duplicate = state.flashcards.find(
      (c) => c.id !== card.id && c.targetPhrase.trim().toLowerCase() === normalizedTarget
    );

    if (duplicate) {
      showToast(`Card "${card.targetPhrase}" already exists!`, 'warning');
      return;
    }

    setState((prev) => {
      const exists = prev.flashcards.some((c) => c.id === card.id);
      const updated = exists
        ? prev.flashcards.map((c) => (c.id === card.id ? card : c))
        : [card, ...prev.flashcards];
      return { ...prev, flashcards: updated };
    });
    playSound('complete', state.settings.soundEnabled);
    showToast(`Flashcard "${card.targetPhrase}" saved.`, 'success');
  };

  const handleDeleteCard = (id: string) => {
    setState((prev) => ({
      ...prev,
      flashcards: prev.flashcards.filter((c) => c.id !== id),
    }));
  };

  const handleReviewBatchComplete = (reviewedCount: number) => {
    setState((prev) => {
      const existingRitual = prev.todayRitual[selectedDay] || {
        shadowingSeconds: 0,
        sprintCompleted: false,
        dailyFlashcardReviewedCount: 0,
        dailyFlashcardsGoalCleared: false,
      };

      const updatedRitual = {
        ...existingRitual,
        dailyFlashcardReviewedCount: existingRitual.dailyFlashcardReviewedCount + reviewedCount,
        dailyFlashcardsGoalCleared: true,
      };

      return {
        ...prev,
        todayRitual: {
          ...prev.todayRitual,
          [selectedDay]: updatedRitual,
        },
      };
    });
  };

  const handleAddMistake = (mistake: MistakeEntry) => {
    setState((prev) => ({
      ...prev,
      mistakes: [mistake, ...prev.mistakes],
    }));
    playSound('complete', state.settings.soundEnabled);
  };

  const handleUpdateMistake = (id: string, updates: Partial<MistakeEntry>) => {
    setState((prev) => ({
      ...prev,
      mistakes: prev.mistakes.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const handleDeleteMistake = (id: string) => {
    setState((prev) => ({
      ...prev,
      mistakes: prev.mistakes.filter((m) => m.id !== id),
    }));
  };

  const handlePushMistakeToFlashcards = (card: Flashcard, mistakeId: string) => {
    setState((prev) => ({
      ...prev,
      flashcards: [card, ...prev.flashcards],
      mistakes: prev.mistakes.map((m) => (m.id === mistakeId ? { ...m, flashcardCreated: true } : m)),
    }));
    playSound('complete', state.settings.soundEnabled);
    showToast(`Mistake converted to flashcard.`, 'success');
  };

  const handleAddLexiconWord = (word: LexiconWord) => {
    setState((prev) => ({
      ...prev,
      lexicon: [word, ...prev.lexicon],
    }));
    playSound('complete', state.settings.soundEnabled);
  };

  const handleDeleteLexiconWord = (id: string) => {
    setState((prev) => ({
      ...prev,
      lexicon: prev.lexicon.filter((w) => w.id !== id),
    }));
  };

  const handlePushLexiconToFlashcards = (card: Flashcard) => {
    setState((prev) => ({
      ...prev,
      flashcards: [card, ...prev.flashcards],
    }));
    playSound('complete', state.settings.soundEnabled);
    showToast(`Word added to flashcards.`, 'success');
  };

  const handleRemoveLexiconFromFlashcards = (targetPhrase: string) => {
    const target = targetPhrase.trim().toLowerCase();
    setState((prev) => ({
      ...prev,
      flashcards: prev.flashcards.filter(
        (c) => c.targetPhrase.trim().toLowerCase() !== target
      ),
    }));
    playSound('flip', state.settings.soundEnabled);
  };

  const handleCommitSprint = (sprint: SprintEntry) => {
    setState((prev) => ({
      ...prev,
      sprints: [sprint, ...prev.sprints],
    }));
  };

  const handleDeleteSprint = (id: string) => {
    setState((prev) => ({
      ...prev,
      sprints: prev.sprints.filter((s) => s.id !== id),
    }));
  };

  const handleCommitShadowingSession = (seconds: number) => {
    const session: TimerSession = {
      id: `timer-shadow-${Date.now()}`,
      mode: 'output',
      skill: 'Shadowing',
      durationSeconds: seconds,
      timestamp: new Date().toISOString(),
      note: `Day ${selectedDay} Active Shadowing`,
    };

    setState((prev) => {
      const existingRitual = prev.todayRitual[selectedDay] || {
        shadowingSeconds: 0,
        sprintCompleted: false,
        dailyFlashcardReviewedCount: 0,
        dailyFlashcardsGoalCleared: false,
      };

      return {
        ...prev,
        timerSessions: [session, ...prev.timerSessions],
        todayRitual: {
          ...prev.todayRitual,
          [selectedDay]: {
            ...existingRitual,
            shadowingSeconds: existingRitual.shadowingSeconds + seconds,
          },
        },
      };
    });
  };

  const handleSaveDailySprint = (text: string, wordCount: number) => {
    const sprint: SprintEntry = {
      id: `sprint-daily-${Date.now()}`,
      title: `Daily Synthesis • Day ${selectedDay}`,
      prompt: `Day ${selectedDay} Deliberate Output Reflection`,
      text,
      wordCount,
      durationMinutes: 5,
      createdAt: new Date().toISOString(),
      origin: 'DAILY',
      dayNumber: selectedDay,
    };

    const timerSession: TimerSession = {
      id: `timer-sprint-${Date.now()}`,
      mode: 'output',
      skill: 'Writing',
      durationSeconds: 300,
      timestamp: new Date().toISOString(),
      note: `Day ${selectedDay} 5m Micro-Writing Sprint`,
    };

    setState((prev) => {
      const existingRitual = prev.todayRitual[selectedDay] || {
        shadowingSeconds: 0,
        sprintCompleted: false,
        dailyFlashcardReviewedCount: 0,
        dailyFlashcardsGoalCleared: false,
      };

      return {
        ...prev,
        sprints: [sprint, ...prev.sprints],
        timerSessions: [timerSession, ...prev.timerSessions],
        todayRitual: {
          ...prev.todayRitual,
          [selectedDay]: {
            ...existingRitual,
            sprintCompleted: true,
          },
        },
      };
    });
  };

  const handleUpdateConsolidation = (weekNumber: number, updates: any) => {
    setState((prev) => {
      const existing = prev.consolidationRecords[weekNumber] || {
        flashcardsCleared: false,
        mistakesReviewed: false,
        shadowingDone: false,
        shadowingSeconds: 0,
        completed: false,
      };

      const updated = { ...existing, ...updates };
      if (updates.completed) {
        updated.completedAt = new Date().toISOString();
      }

      return {
        ...prev,
        consolidationRecords: {
          ...prev.consolidationRecords,
          [weekNumber]: updated,
        },
      };
    });
  };

  const handleInspectUnit = (bookId: string, unitStr: string) => {
    try {
      const book = getBook(bookId as any);
      const unit = book.units.find((u) => u.unit === unitStr) || {
        unit: unitStr,
        title: `${book.book_title} Unit ${unitStr}`,
      };
      setInspectingBook(book);
      setInspectingUnit(unit);
    } catch (err) {
      console.warn('Failed to find unit for inspection:', err);
    }
  };

  const handleNavigateToDay = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setActiveTab('today');
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
        <div className="font-mono text-sm font-bold text-black animate-pulse flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#312E81] rounded-full" />
          <span>Connecting to Local Storage Vault...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'lexicon') {
            setLexiconSearchQuery('');
          }
          setActiveTab(tab);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        state={state}
        onToggleSound={handleToggleSound}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
        {activeTab === 'today' && (
          <TodayView
            state={state}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onShiftSchedule={handleShiftSchedule}
            onUnshiftSchedule={handleUnshiftSchedule}
            onNavigateToStudio={() => setActiveTab('studio')}
            onNavigateToMistakes={() => setActiveTab('mistakes')}
            onOpenReviewModal={() => setIsReviewModalOpen(true)}
            onUpdateUnitProgress={handleUpdateUnitProgress}
            onCompleteUnit={handleCompleteUnit}
            onAddFlashcard={handleSaveCard}
            onInspectUnit={handleInspectUnit}
            onCommitShadowingSession={handleCommitShadowingSession}
            onSaveDailySprint={handleSaveDailySprint}
            onUpdateConsolidation={handleUpdateConsolidation}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            state={state}
            onSelectDayAndNavigate={handleNavigateToDay}
          />
        )}

        {activeTab === 'cards' && (
          <CardsView
            state={state}
            onOpenReviewModal={() => setIsReviewModalOpen(true)}
            onSaveCard={handleSaveCard}
            onDeleteCard={handleDeleteCard}
            onNavigateToLexicon={(word) => {
              setLexiconSearchQuery(word);
              setActiveTab('lexicon');
            }}
          />
        )}

        {activeTab === 'lexicon' && (
          <LexiconView
            state={state}
            onAddWord={handleAddLexiconWord}
            onDeleteWord={handleDeleteLexiconWord}
            onPushToFlashcards={handlePushLexiconToFlashcards}
            onRemoveFromFlashcards={handleRemoveLexiconFromFlashcards}
            initialSearchQuery={lexiconSearchQuery}
          />
        )}

        {activeTab === 'mistakes' && (
          <MistakesView
            state={state}
            onAddMistake={handleAddMistake}
            onUpdateMistake={handleUpdateMistake}
            onDeleteMistake={handleDeleteMistake}
            onPushMistakeToFlashcards={handlePushMistakeToFlashcards}
          />
        )}

        {activeTab === 'studio' && (
          <StudioView
            state={state}
            onCommitTimerSession={(sess) => {
              setState((prev) => ({
                ...prev,
                timerSessions: [sess, ...prev.timerSessions],
              }));
            }}
            onSaveSprintFromStudio={(sprint) => {
              setState((prev) => ({
                ...prev,
                sprints: [sprint, ...prev.sprints],
              }));
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView state={state} />
        )}

        {activeTab === 'sprints' && (
          <SprintsView
            state={state}
            onCommitSprint={handleCommitSprint}
            onDeleteSprint={handleDeleteSprint}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            state={state}
            onNavigateToDay={handleNavigateToDay}
          />
        )}
      </main>

      <SmartFAB
        onOpenAddCard={() => setIsAddCardModalOpen(true)}
        onOpenAddMistake={() => setIsAddMistakeModalOpen(true)}
        onOpenSprintRunner={() => setActiveTab('sprints')}
        onOpenStudioTimer={() => setActiveTab('studio')}
        onOpenQuickSearch={() => setActiveTab('library')}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        cards={state.flashcards}
        onUpdateCard={handleSaveCard}
        onReviewBatchComplete={handleReviewBatchComplete}
        dailyCap={state.settings.dailyReviewCap}
        soundEnabled={state.settings.soundEnabled}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        state={state}
        onUpdateSettings={handleUpdateSettings}
        onRestoreState={handleRestoreState}
        onResetState={handleResetState}
        onClearAllData={handleClearAllUserData}
        onResetStreaks={handleResetActiveDayProgress}
      />

      <CardEditorModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        cardToEdit={null}
        onSaveCard={handleSaveCard}
      />

      <MistakeModal
        isOpen={isAddMistakeModalOpen}
        onClose={() => setIsAddMistakeModalOpen(false)}
        onAddMistake={handleAddMistake}
      />

      <LexiconModal
        isOpen={isAddLexiconModalOpen}
        onClose={() => setIsAddLexiconModalOpen(false)}
        onAddWord={handleAddLexiconWord}
      />

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
        onNavigateToDay={handleNavigateToDay}
      />

      <ToastContainer />
    </div>
  );
}

export default App;