import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { AppState, DayPlan } from '../../types';
import { MASTER_SCHEDULE, TOTAL_WEEKS } from '../../services/scheduler';
import { Badge } from '../common/Badge';

interface ScheduleViewProps {
  state: AppState;
  onSelectDayAndNavigate: (dayNumber: number) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  state,
  onSelectDayAndNavigate,
}) => {
  const [phaseFilter, setPhaseFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const totalCompletedUnits = Object.values(state.unitProgress).filter((p) => p.completed).length;
  const currentDay = state.settings.currentActiveDay;

  // محاسبه تاریخ پویا برای هر روز بر اساس فاصله آن تا روز فعال سیستم
  const getDateForDay = (targetDay: number) => {
    const diff = targetDay - currentDay;
    const d = new Date();
    d.setDate(d.getDate() + diff);
    return new Intl.DateTimeFormat('fa-IR', {
      day: 'numeric',
      month: 'long',
    }).format(d);
  };

  // دسته‌بندی برنامه به تفکیک ۲۴ هفته
  const weeksMap: DayPlan[][] = [];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const daysInWeek = MASTER_SCHEDULE.filter((d) => d.weekNumber === w);
    weeksMap.push(daysInWeek);
  }

  // فیلتر هفته‌ها
  const filteredWeeks = weeksMap.filter((weekDays) => {
    if (weekDays.length === 0) return false;
    const weekPhase = weekDays[0].phase;
    if (phaseFilter !== 'all' && weekPhase !== phaseFilter) return false;

    if (statusFilter !== 'all') {
      const isWeekFullyDone = weekDays.every((day) => {
        if (day.isConsolidation) {
          return state.consolidationRecords[day.weekNumber]?.completed;
        }
        return day.slots.every((s) => state.unitProgress[`${s.bookId}_${s.unit}`]?.completed);
      });
      if (statusFilter === 'completed' && !isWeekFullyDone) return false;
      if (statusFilter === 'pending' && isWeekFullyDone) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* ۱. کارت‌های آمار بالای تقویم */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* کارت روز فعال */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-black/60 uppercase">
              Current Active Mission
            </div>
            <div className="text-3xl font-black text-black font-mono mt-1">
              Day {currentDay}
            </div>
            <div className="text-xs font-mono text-black/70 mt-0.5">
              Week {Math.ceil(currentDay / 6)} • Day {((currentDay - 1) % 6) + 1}/6
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFF3C4] border-2 border-black flex items-center justify-center neo-shadow-sm">
            <CalendarDays className="w-6 h-6 text-black" />
          </div>
        </div>

        {/* کارت واحدهای تکمیل‌شده */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-black/60 uppercase">
              Curriculum Units Done
            </div>
            <div className="text-3xl font-black text-black font-mono mt-1">
              {totalCompletedUnits} <span className="text-base text-black/50 font-normal">/ 828</span>
            </div>
            <div className="text-xs font-mono text-emerald-800 font-semibold mt-0.5">
              {Math.round((totalCompletedUnits / 828) * 100)}% Master Progress
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#C8E6C9] border-2 border-black flex items-center justify-center neo-shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-black" />
          </div>
        </div>

        {/* کارت شیفت برنامه */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-black/60 uppercase">
              Schedule Safeguard
            </div>
            <div className="text-3xl font-black text-black font-mono mt-1">
              +{state.settings.shiftedDays}d
            </div>
            <div className="text-xs font-mono text-black/70 mt-0.5">
              Illness & Vacation Shifted Days
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#D1C4E9] border-2 border-black flex items-center justify-center neo-shadow-sm">
            <Clock className="w-6 h-6 text-black" />
          </div>
        </div>
      </div>

      {/* ۲. فیلترها */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-4 neo-shadow flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono font-bold text-black flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Phase:
          </span>
          <button
            type="button"
            onClick={() => setPhaseFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
              phaseFilter === 'all'
                ? 'bg-black text-white neo-shadow-sm'
                : 'bg-black/5 text-black hover:bg-black/10'
            }`}
          >
            All 24 Weeks
          </button>
          <button
            type="button"
            onClick={() => setPhaseFilter(1)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
              phaseFilter === 1
                ? 'bg-[#FFCDD2] text-black border-2 border-black neo-shadow-sm'
                : 'bg-black/5 text-black hover:bg-black/10'
            }`}
          >
            Phase 1: A1 → A2 (W1–8)
          </button>
          <button
            type="button"
            onClick={() => setPhaseFilter(2)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
              phaseFilter === 2
                ? 'bg-[#C8E6C9] text-black border-2 border-black neo-shadow-sm'
                : 'bg-black/5 text-black hover:bg-black/10'
            }`}
          >
            Phase 2: B1 → B2 (W9–16)
          </button>
          <button
            type="button"
            onClick={() => setPhaseFilter(3)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
              phaseFilter === 3
                ? 'bg-[#D1C4E9] text-black border-2 border-black neo-shadow-sm'
                : 'bg-black/5 text-black hover:bg-black/10'
            }`}
          >
            Phase 3: B2 → C1 (W17–24)
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-black/60 mr-1">Status:</span>
          {(['all', 'completed', 'pending'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize cursor-pointer transition-all ${
                statusFilter === st
                  ? 'bg-black text-white font-bold neo-shadow-sm'
                  : 'bg-black/5 text-black hover:bg-black/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ۳. گرید ۲۴ هفته */}
      <div className="space-y-6">
        {filteredWeeks.map((weekDays) => {
          if (weekDays.length === 0) return null;
          const weekNum = weekDays[0].weekNumber;
          const phaseNum = weekDays[0].phase;
          const phaseLabel = weekDays[0].phaseLabel;

          let weekUnitsTotal = 0;
          let weekUnitsDone = 0;
          weekDays.forEach((d) => {
            if (!d.isConsolidation) {
              weekUnitsTotal += d.slots.length;
              d.slots.forEach((s) => {
                if (state.unitProgress[`${s.bookId}_${s.unit}`]?.completed) {
                  weekUnitsDone++;
                }
              });
            }
          });

          const isConsolidationComplete = state.consolidationRecords[weekNum]?.completed;

          return (
            <div
              key={`week-${weekNum}`}
              className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/10">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-black text-[#FFFDF5] flex items-center justify-center font-mono font-black text-base neo-shadow-sm">
                    W{weekNum}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-black flex items-center gap-2">
                      <span>Week {weekNum} of 24</span>
                      <Badge variant="indigo" size="sm">
                        Phase {phaseNum}
                      </Badge>
                    </h3>
                    <p className="text-xs font-mono text-black/60">{phaseLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-right">
                    <span className="font-bold text-black">
                      {weekUnitsDone} / {weekUnitsTotal} Units Done
                    </span>
                    <span className="text-black/50 ml-1">
                      ({weekUnitsTotal > 0 ? Math.round((weekUnitsDone / weekUnitsTotal) * 100) : 0}%)
                    </span>
                  </div>
                  {isConsolidationComplete && (
                    <Badge variant="mint" size="sm">
                      Consolidated ✅
                    </Badge>
                  )}
                </div>
              </div>

              {/* گرید روزها */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
                {weekDays.map((day) => {
                  const isCurrentActive = day.dayNumber === currentDay;
                  const dateStr = getDateForDay(day.dayNumber);

                  // روز ۶ (Consolidation)
                  if (day.isConsolidation) {
                    const isConsDone = state.consolidationRecords[day.weekNumber]?.completed;
                    return (
                      <div
                        key={`day-${day.dayNumber}`}
                        onClick={() => onSelectDayAndNavigate(day.dayNumber)}
                        className={`cursor-pointer rounded-2xl p-3 border-2 border-black transition-all hover:scale-[1.02] flex flex-col justify-between ${
                          isCurrentActive
                            ? 'ring-3 ring-[#312E81] shadow-[2px_2px_0px_0px_#312E81]'
                            : ''
                        } ${
                          isConsDone
                            ? 'bg-[#C8E6C9]/40'
                            : 'bg-[#D1C4E9]/30 hover:bg-[#D1C4E9]/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs text-black">
                              DAY {day.dayNumber}
                            </span>
                            <span
                              dir="rtl"
                              className="text-[10px] font-sans font-bold bg-[#E0E7FF] text-[#312E81] px-1.5 py-0.5 rounded border border-black/15 shadow-2xs"
                            >
                              {dateStr}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-black mt-1">
                            Consolidation Wizard
                          </div>
                          <p className="text-[10px] text-black/70 mt-1 leading-tight">
                            3-Step Clearance • Zero Lessons • Shadowing
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-mono">
                          <span className={isConsDone ? 'text-emerald-800 font-bold' : 'text-black/60'}>
                            {isConsDone ? 'Consolidated ✅' : 'Pending Buffer'}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-black/50" />
                        </div>
                      </div>
                    );
                  }

                  // روزهای ۱ تا ۵
                  const daySlots = day.slots;
                  const dayCompletedSlots = daySlots.filter(
                    (s) => state.unitProgress[`${s.bookId}_${s.unit}`]?.completed
                  ).length;
                  const isDayFullyComplete = dayCompletedSlots === daySlots.length && daySlots.length > 0;

                  return (
                    <div
                      key={`day-${day.dayNumber}`}
                      onClick={() => onSelectDayAndNavigate(day.dayNumber)}
                      className={`cursor-pointer rounded-2xl p-3 border-2 border-black transition-all hover:scale-[1.02] flex flex-col justify-between ${
                        isCurrentActive
                          ? 'bg-[#FFF3C4] ring-3 ring-[#312E81] shadow-[2px_2px_0px_0px_#312E81]'
                          : isDayFullyComplete
                          ? 'bg-[#C8E6C9]/30'
                          : 'bg-[#FFFDF5] hover:bg-black/2.5'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-xs text-black">
                            DAY {day.dayNumber}
                          </span>
                          <span
                            dir="rtl"
                            className="text-[10px] font-sans font-bold bg-[#E0E7FF] text-[#312E81] px-1.5 py-0.5 rounded border border-black/15 shadow-2xs"
                          >
                            {dateStr}
                          </span>
                        </div>

                        <div className="space-y-1 mt-1.5">
                          {daySlots.map((slot, sIdx) => {
                            const isDone = state.unitProgress[`${slot.bookId}_${slot.unit}`]?.completed;
                            return (
                              <div
                                key={sIdx}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-black/10 truncate flex items-center justify-between ${
                                  isDone ? 'bg-[#C8E6C9] text-black font-semibold' : 'bg-black/5 text-black/80'
                                }`}
                                title={`${slot.bookId} Unit ${slot.unit}: ${slot.title}`}
                              >
                                <span>
                                  {slot.bookId} U{slot.unit}
                                </span>
                                {isDone && <span>✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-mono">
                        <span className={isDayFullyComplete ? 'text-emerald-800 font-bold' : 'text-black/60'}>
                          {dayCompletedSlots}/{daySlots.length} Done
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-black/50" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};