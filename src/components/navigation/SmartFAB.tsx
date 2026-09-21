import React, { useState, useEffect } from 'react';
import { Plus, Zap, PenTool, Layers, AlertOctagon, Search, Clock } from 'lucide-react';

interface SmartFABProps {
  onOpenAddCard: () => void;
  onOpenAddMistake: () => void;
  onOpenSprintRunner: () => void;
  onOpenStudioTimer: () => void;
  onOpenQuickSearch: () => void;
}

export const SmartFAB: React.FC<SmartFABProps> = ({
  onOpenAddCard,
  onOpenAddMistake,
  onOpenSprintRunner,
  onOpenStudioTimer,
  onOpenQuickSearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Self-dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      {/* Backdrop for auto-dismissal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating menu items */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
        {isOpen && (
          <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-5 duration-150">
            <button
              onClick={() => triggerAction(onOpenQuickSearch)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 border-black bg-[#FFF3C4] text-black font-semibold text-xs neo-shadow neo-btn cursor-pointer whitespace-nowrap"
            >
              <Search className="w-4 h-4 text-black" />
              <span>Quick Unit Finder (828 Units)</span>
            </button>

            <button
              onClick={() => triggerAction(onOpenStudioTimer)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 border-black bg-[#D1C4E9] text-black font-semibold text-xs neo-shadow neo-btn cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-4 h-4 text-black" />
              <span>Multi-Skill Focus Timer</span>
            </button>

            <button
              onClick={() => triggerAction(onOpenSprintRunner)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 border-black bg-[#C8E6C9] text-black font-semibold text-xs neo-shadow neo-btn cursor-pointer whitespace-nowrap"
            >
              <PenTool className="w-4 h-4 text-black" />
              <span>Free Micro-Writing Sprint</span>
            </button>

            <button
              onClick={() => triggerAction(onOpenAddCard)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 border-black bg-[#FFFDF5] text-black font-semibold text-xs neo-shadow neo-btn cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-4 h-4 text-black" />
              <span>+ New Cloze Flashcard</span>
            </button>

            <button
              onClick={() => triggerAction(onOpenAddMistake)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 border-black bg-[#FFCDD2] text-black font-semibold text-xs neo-shadow neo-btn cursor-pointer whitespace-nowrap"
            >
              <AlertOctagon className="w-4 h-4 text-black" />
              <span>+ Log Mistake Vault Entry</span>
            </button>
          </div>
        )}

        {/* Master FAB Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Quick Actions"
          className={`w-13 h-13 rounded-2xl border-2 border-black bg-[#FF2A5F] text-white flex items-center justify-center neo-shadow-lg neo-btn cursor-pointer transition-transform duration-200 ${
            isOpen ? 'rotate-45' : 'hover:scale-105'
          }`}
        >
          {isOpen ? <Plus className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
};
