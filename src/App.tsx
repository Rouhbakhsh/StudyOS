import { useState, useEffect, useCallback } from 'react';
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
import { loadAppState, saveAppState, scheduleSave, flushPendingSave } from './services/storage';
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
import { getBook, getPlanForDay, TOTAL_DAYS } from './services/scheduler';
import { getTodayDateString } from './utils/date';
import {
  applyDayRollover,
  createFreshPlanState,
  migratePlanDates,
} from './services/progress';
import { WelcomeScreen } from './components/common/WelcomeScreen';
import { CatchUpNotice, CatchUpInfo } from './components/common/CatchUpNotice';

export function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(() => new Set(['today']));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);
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

  // Catch up notice state
  const [catchUpInfo, setCatchUpInfo] = useState<CatchUpInfo | null>(null);

  // ۱. بارگذاری اولیه، پشتیبانی از صفحه خوشامد و رول‌اور هوشمند روزانه
  useEffect(() => {
    loadAppState().then((saved) => {
      let workingState = saved;
      const today = getTodayDateString();

      // همگام‌سازی یادداشت‌های فارسی با حافظه لوکال
      if (workingState.lexiconNotes && typeof workingState.lexiconNotes === 'object') {
        try {
          const existing = JSON.parse(localStorage.getItem('oxford_persian_notes') || '{}');
          localStorage.setItem(
            'oxford_persian_notes',
            JSON.stringify({ ...existing, ...workingState.lexiconNotes })
          );
        } catch {}
      }

      // اولین اجرا: هدایت به صفحه خوشامد
      if (!workingState.settings.onboardedAt) {
        setState(workingState);
        setIsHydrated(true);
        return;
      }

      // انتقال و تنظیم تاریخ‌های شروع برای کاربرانی که قبلاً بدون Onboarding شروع کرده بودند
      workingState = {
        ...workingState,
        settings: migratePlanDates(workingState.settings, today),
      };

      // رول‌اور تقویمی بدون انباشت درس‌ها
      const rollover = applyDayRollover(workingState, today);
      if (rollover.changed) {
        workingState = rollover.state;
        if (rollover.missedDays > 0) {
          setCatchUpInfo({
            missedDays: rollover.missedDays,
            activeDay: rollover.activeDay,
          });
        } else if (rollover.finishedDay !== null) {
          showToast(`Day ${rollover.finishedDay} complete. Day ${rollover.activeDay} is ready.`, 'success');
        }
      }

      setState(workingState);
      if (workingState.settings?.currentActiveDay) {
        setSelectedDay(workingState.settings.currentActiveDay);
      }
      setIsHydrated(true);
    });
  }, []);

  // ۲. بررسی خودکار عبور از نیمه‌شب حتی در صورتی که برنامه مداوم باز بماند یا ویندوز از Sleep خارج شود
  useEffect(() => {
    if (!isHydrated) return;

    const checkMidnight = () => {
      const today = getTodayDateString();
      setState((prev) => {
        if (!prev.settings.onboardedAt || prev.settings.lastOpenedDate === today) {
          return prev;
        }
        const rollover = applyDayRollover(prev, today);
        if (rollover.changed) {
          if (rollover.missedDays > 0) {
            setCatchUpInfo({
              missedDays: rollover.missedDays,
              activeDay: rollover.activeDay,
            });
          } else if (rollover.finishedDay !== null) {
            showToast(`Day ${rollover.finishedDay} complete. Day ${rollover.activeDay} is ready.`, 'success');
          }
          setSelectedDay((current) => (current === prev.settings.currentActiveDay ? rollover.activeDay : current));
          return rollover.state;
        }
        return prev;
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkMidnight();
    };

    const interval = setInterval(checkMidnight, 30000); // چک کردن هر ۳۰ ثانیه
    window.addEventListener('focus', checkMidnight);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkMidnight);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isHydrated]);

  // ۳. اتوسیو بلادرنگ با Debounce برای کاهش استهلاک حافظه/دیسک
  useEffect(() => {
    if (!isHydrated) return;
    scheduleSave(state);
  }, [state, isHydrated]);

  // نوشتن فوری آخرین تغییرات هنگام بستن یا رفرش پنجره
  useEffect(() => {
    window.addEventListener('beforeunload', flushPendingSave);
    return () => window.removeEventListener('beforeunload', flushPendingSave);
  }, []);

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
    return () => {
      window.removeEventListener('switch-tab', handleSwitchTab);
    };
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

  const handleStartPlan = (learnerName: string) => {
    const today = getTodayDateString();
    const fresh = createFreshPlanState(learnerName, today);
    setState(fresh);
    setSelectedDay(1);
    playSound('complete', true);
  };

  const handleRestoreState = (restoredState: AppState) => {
    const today = getTodayDateString();
    const migratedSettings = migratePlanDates(restoredState.settings, today);
    const finalState = { ...restoredState, settings: migratedSettings };
    setState(finalState);
    setSelectedDay(finalState.settings.currentActiveDay || 1);
    playSound('complete', true);
    showToast('Vault backup restored successfully.', 'success');
  };

  const handleSaveLexiconNote = (word: string, note: string) => {
    setState((prev) => {
      const notes = { ...(prev.lexiconNotes || {}) };
      const key = word.toLowerCase();
      if (note.trim()) {
        notes[key] = note;
      } else {
        delete notes[key];
      }
      return { ...prev, lexiconNotes: notes };
    });
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
      lexiconNotes: {},
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

  const handleUpdateUnitProgress = useCallback((unitKey: string, updates: Partial<UnitProgress>) => {
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
  }, []);

  const handleCompleteUnit = useCallback((unitKey: string, timeSpentSeconds: number) => {
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
  }, [state.settings.soundEnabled]);

  const handleSaveCard = useCallback((card: Flashcard) => {
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
  }, [state.flashcards, state.settings.soundEnabled]);

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

  // اولین اجرا: صفحه خوشامد
  if (!state.settings.onboardedAt) {
    return (
      <WelcomeScreen
        onStart={handleStartPlan}
        onRestore={handleRestoreState}
      />
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
        <div className={activeTab === 'today' ? 'block' : 'hidden'}>
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
        </div>

        {visitedTabs.has('schedule') && (
          <div className={activeTab === 'schedule' ? 'block' : 'hidden'}>
            <ScheduleView
              state={state}
              onSelectDayAndNavigate={handleNavigateToDay}
            />
          </div>
        )}

        {visitedTabs.has('cards') && (
          <div className={activeTab === 'cards' ? 'block' : 'hidden'}>
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
          </div>
        )}

        {visitedTabs.has('lexicon') && (
          <div className={activeTab === 'lexicon' ? 'block' : 'hidden'}>
            <LexiconView
              state={state}
              onAddWord={handleAddLexiconWord}
              onDeleteWord={handleDeleteLexiconWord}
              onPushToFlashcards={handlePushLexiconToFlashcards}
              onRemoveFromFlashcards={handleRemoveLexiconFromFlashcards}
              onSaveNote={handleSaveLexiconNote}
              initialSearchQuery={lexiconSearchQuery}
            />
          </div>
        )}

        {visitedTabs.has('mistakes') && (
          <div className={activeTab === 'mistakes' ? 'block' : 'hidden'}>
            <MistakesView
              state={state}
              onAddMistake={handleAddMistake}
              onUpdateMistake={handleUpdateMistake}
              onDeleteMistake={handleDeleteMistake}
              onPushMistakeToFlashcards={handlePushMistakeToFlashcards}
            />
          </div>
        )}

        {visitedTabs.has('studio') && (
          <div className={activeTab === 'studio' ? 'block' : 'hidden'}>
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
          </div>
        )}

        {visitedTabs.has('analytics') && (
          <div className={activeTab === 'analytics' ? 'block' : 'hidden'}>
            <AnalyticsView state={state} />
          </div>
        )}

        {visitedTabs.has('sprints') && (
          <div className={activeTab === 'sprints' ? 'block' : 'hidden'}>
            <SprintsView
              state={state}
              onCommitSprint={handleCommitSprint}
              onDeleteSprint={handleDeleteSprint}
            />
          </div>
        )}

        {visitedTabs.has('library') && (
          <div className={activeTab === 'library' ? 'block' : 'hidden'}>
            <LibraryView
              state={state}
              onNavigateToDay={handleNavigateToDay}
            />
          </div>
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

      <CatchUpNotice
        info={catchUpInfo}
        learnerName={state.settings.learnerName}
        totalShiftedDays={state.settings.shiftedDays || 0}
        onContinue={() => setCatchUpInfo(null)}
        onClose={() => setCatchUpInfo(null)}
      />

      <ToastContainer />
    </div>
  );
}

export default App;