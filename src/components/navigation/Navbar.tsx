import React, { useTransition, useRef, useEffect } from 'react';
import {
  CalendarDays,
  Flame,
  Layers,
  BookMarked,
  AlertOctagon,
  Activity,
  BarChart3,
  PenTool,
  Library as LibraryIcon,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppState } from '../../types';
import { Badge } from '../common/Badge';

export type TabKey =
  | 'today'
  | 'schedule'
  | 'cards'
  | 'lexicon'
  | 'mistakes'
  | 'studio'
  | 'analytics'
  | 'sprints'
  | 'library';

interface NavbarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenSettings: () => void;
  state: AppState;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  state,
  onToggleSound,
}) => {
  const [, startTransition] = useTransition();
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const currentDay = state.settings.currentActiveDay;
  const currentWeek = Math.ceil(currentDay / 6);
  const phase = currentWeek <= 8 ? 1 : currentWeek <= 16 ? 2 : 3;

  const todayStr = new Date().toISOString().split('T')[0];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badgeCount?: number }[] = [
    { key: 'today', label: 'Today', icon: <Flame className="w-4 h-4 shrink-0" /> },
    { key: 'schedule', label: 'Schedule', icon: <CalendarDays className="w-4 h-4 shrink-0" /> },
    {
      key: 'cards',
      label: 'Cards',
      icon: <Layers className="w-4 h-4 shrink-0" />,
      badgeCount: state.flashcards.filter((c) => !c.dueDate || c.dueDate <= todayStr).length,
    },
    { key: 'lexicon', label: 'Lexicon', icon: <BookMarked className="w-4 h-4 shrink-0" /> },
    {
      key: 'mistakes',
      label: 'Mistakes',
      icon: <AlertOctagon className="w-4 h-4 shrink-0" />,
      badgeCount: state.mistakes.filter((m) => !m.mastered && m.status !== 'resolved').length,
    },
    { key: 'studio', label: 'Studio', icon: <Activity className="w-4 h-4 shrink-0" /> },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
    { key: 'sprints', label: 'Sprints', icon: <PenTool className="w-4 h-4 shrink-0" /> },
    { key: 'library', label: 'Library', icon: <LibraryIcon className="w-4 h-4 shrink-0" /> },
  ];

  // هدایت خودکار تب فعال به وسط نوار در موبایل
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  const handleTabClick = (key: TabKey) => {
    if (key === activeTab) return;
    startTransition(() => {
      onSelectTab(key);
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF5] border-b-2 border-black select-none shadow-xs">
      {/* ردیف بالا: برند، اطلاعات فاز و ابزارها */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between border-b border-black/10">
        <div
          onClick={() => handleTabClick('today')}
          className="cursor-pointer flex items-center gap-2 sm:gap-2.5 select-none shrink-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-black text-[#FFFDF5] flex items-center justify-center font-mono font-black text-xs sm:text-sm shadow-[1.5px_1.5px_0px_0px_#000]">
            OS
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-black tracking-tight text-base sm:text-lg font-sans">
              StudyOS
            </span>
            <div className="hidden xs:block">
              <Badge variant="indigo" size="sm">
                A1 → C1
              </Badge>
            </div>
            <span className="text-[11px] font-mono text-black/60 hidden md:inline-block">
              • Phase {phase} (Week {currentWeek} • Day {((currentDay - 1) % 6) + 1})
            </span>
          </div>
        </div>

        {/* دکمه‌های کنترلی سمت راست هدر */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleSound}
            title={state.settings.soundEnabled ? 'Audio Chimes Active' : 'Audio Muted'}
            className="h-8 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border-2 border-black bg-[#FFFDF5] hover:bg-[#FFF3C4] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5 text-xs font-mono font-semibold transition-transform"
          >
            {state.settings.soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-black shrink-0" />
                <span className="hidden sm:inline">Audio</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-black/40 shrink-0" />
                <span className="hidden sm:inline text-black/50">Muted</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="System Configuration & Safeguards"
            className="h-8 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border-2 border-black bg-[#FFFDF5] hover:bg-[#FFF3C4] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5 transition-transform"
          >
            <Settings className="w-3.5 h-3.5 text-black shrink-0" />
            <span className="text-xs font-mono font-bold hidden sm:inline">Config</span>
          </button>
        </div>
      </div>

      {/* ردیف پایین: نوار تب‌ها با اسکرول افقی کامپکت مخصوص موبایل و چیدمان وسط‌چین دسکتاپ */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-1.5 sm:py-2">
        <nav className="flex items-center justify-start md:justify-center gap-1.5 sm:gap-2 overflow-x-auto scroll-smooth py-0.5 px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                ref={isActive ? activeTabRef : null}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl font-sans text-xs sm:text-sm font-semibold select-none cursor-pointer border-2 transition-all active:scale-95 ${
                  isActive
                    ? 'bg-black text-white border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                    : 'bg-black/5 text-black hover:bg-black/10 border-transparent'
                }`}
              >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-tight ${
                      isActive
                        ? 'bg-[#FF2A5F] text-white'
                        : 'bg-[#FFF3C4] text-black border border-black/20'
                    }`}
                  >
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;