import React, { useTransition } from 'react';
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

  const currentDay = state.settings.currentActiveDay;
  const currentWeek = Math.ceil(currentDay / 6);
  const phase = currentWeek <= 8 ? 1 : currentWeek <= 16 ? 2 : 3;

  const todayStr = new Date().toISOString().split('T')[0];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badgeCount?: number }[] = [
    { key: 'today', label: 'Today', icon: <Flame className="w-4 h-4" /> },
    { key: 'schedule', label: 'Schedule', icon: <CalendarDays className="w-4 h-4" /> },
    {
      key: 'cards',
      label: 'Cards',
      icon: <Layers className="w-4 h-4" />,
      badgeCount: state.flashcards.filter((c) => !c.dueDate || c.dueDate <= todayStr).length,
    },
    { key: 'lexicon', label: 'Lexicon', icon: <BookMarked className="w-4 h-4" /> },
    {
      key: 'mistakes',
      label: 'Mistakes',
      icon: <AlertOctagon className="w-4 h-4" />,
      badgeCount: state.mistakes.filter((m) => !m.mastered && m.status !== 'resolved').length,
    },
    { key: 'studio', label: 'Studio', icon: <Activity className="w-4 h-4" /> },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'sprints', label: 'Sprints', icon: <PenTool className="w-4 h-4" /> },
    { key: 'library', label: 'Library', icon: <LibraryIcon className="w-4 h-4" /> },
  ];

  // سوییچ نرم بدون قفل کردن فریم‌ها
  const handleTabClick = (key: TabKey) => {
    if (key === activeTab) return;
    startTransition(() => {
      onSelectTab(key);
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF5] border-b-2 border-black select-none">
      {/* ردیف بالا: برند، فاز و ابزارها */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between border-b border-black/10">
        <div
          onClick={() => handleTabClick('today')}
          className="cursor-pointer flex items-center gap-2.5 select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-black text-[#FFFDF5] flex items-center justify-center font-mono font-black text-sm shadow-[1.5px_1.5px_0px_0px_#000]">
            OS
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black tracking-tight text-lg font-sans">
              StudyOS
            </span>
            <Badge variant="indigo" size="sm">
              A1 → B2/C1
            </Badge>
            <span className="text-[11px] font-mono text-black/60 hidden sm:inline-block">
              • Phase {phase} (Week {currentWeek} • Day {((currentDay - 1) % 6) + 1})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            title={state.settings.soundEnabled ? 'Audio Chimes Active' : 'Audio Muted'}
            className="p-1.5 px-2 rounded-xl border-2 border-black bg-[#FFFDF5] hover:bg-[#FFF3C4] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1 text-xs font-mono font-semibold"
          >
            {state.settings.soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-black" />
                <span className="hidden sm:inline">Audio</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-black/40" />
                <span className="hidden sm:inline text-black/50">Muted</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="System Configuration & Safeguards"
            className="p-1.5 px-2.5 rounded-xl border-2 border-black bg-[#FFFDF5] hover:bg-[#FFF3C4] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-black" />
            <span className="text-xs font-mono font-bold">Config</span>
          </button>
        </div>
      </div>

      {/* ردیف پایین: تب‌ها بدون پرش سایه و فوق‌العاده سریع */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2">
        <nav className="flex items-center justify-start md:justify-center flex-wrap gap-1.5 sm:gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-sans text-xs sm:text-sm font-semibold select-none cursor-pointer border-2 ${
                  isActive
                    ? 'bg-black text-white border-black'
                    : 'bg-black/5 text-black hover:bg-black/10 border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-[#FF2A5F] text-white' : 'bg-[#FFF3C4] text-black border border-black/20'
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