import React from 'react';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { getPlanForDay } from '../../services/scheduler';
import { estimateFinishDate } from '../../services/progress';
import { parseLocalDate } from '../../utils/date';

export interface CatchUpInfo {
  missedDays: number;
  activeDay: number;
}

interface CatchUpNoticeProps {
  info: CatchUpInfo | null;
  learnerName?: string;
  totalShiftedDays: number;
  onContinue: () => void;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d) : dateStr;
}

// اطلاع‌رسانی روز(های) جامانده؛ برنامه قبلاً خودکار جلو رفته و این فقط خبر می‌دهد
export const CatchUpNotice: React.FC<CatchUpNoticeProps> = ({ info, learnerName, totalShiftedDays, onContinue, onClose }) => {
  if (!info) return null;

  const { missedDays, activeDay } = info;
  const plan = getPlanForDay(activeDay);
  const focus = plan.isConsolidation
    ? 'Consolidation day'
    : Array.from(new Set(plan.slots.map((s) => s.focusArea))).slice(0, 3).join(' · ');
  const title = missedDays === 1 ? "Yesterday's lessons are still waiting" : `You've been away for ${missedDays} days`;

  return (
    <Modal isOpen onClose={onClose} title={title} subtitle="Your plan moved forward automatically" maxWidth="md">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="anim-pop w-12 h-12 shrink-0 rounded-2xl bg-[#FFF3C4] border-2 border-black flex items-center justify-center neo-shadow-sm">
            <CalendarClock className="w-6 h-6 text-black" />
          </div>
          <p className="text-sm text-black/80 leading-relaxed">
            {learnerName ? `Welcome back, ${learnerName}. ` : 'Welcome back. '}
            Nothing was skipped: <span className="font-bold text-black">Day {activeDay}</span> is ready for you, and the
            rest of your plan moved forward by {missedDays} {missedDays === 1 ? 'day' : 'days'}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border-2 border-black/80 rounded-2xl p-3">
            <div className="font-mono text-[10px] font-bold uppercase text-black/55">Up next</div>
            <div className="text-sm font-bold text-black mt-0.5">Day {activeDay}</div>
            <div className="text-[11px] text-black/65 mt-0.5 leading-snug">{focus}</div>
          </div>
          <div className="bg-white border-2 border-black/80 rounded-2xl p-3">
            <div className="font-mono text-[10px] font-bold uppercase text-black/55">New finish date</div>
            <div className="text-sm font-bold text-black mt-0.5">{formatDate(estimateFinishDate(activeDay))}</div>
            <div className="text-[11px] text-black/65 mt-0.5">Total shift: +{totalShiftedDays}d</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-black bg-[#312E81] text-white text-base font-bold neo-shadow neo-btn cursor-pointer hover:bg-[#3B37A0]"
        >
          Continue Day {activeDay}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </Modal>
  );
};

export default CatchUpNotice;
