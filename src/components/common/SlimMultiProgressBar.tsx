import React from 'react';
import { AppState } from '../../types';

interface SlimMultiProgressBarProps {
  state: AppState;
  onNavigateToStudio: () => void;
}

export const SlimMultiProgressBar: React.FC<SlimMultiProgressBarProps> = ({
  state,
  onNavigateToStudio,
}) => {
  // Compute completed counts across 4 skill domains
  let grammarDone = 0;
  let vocabDone = 0;
  let phraseDone = 0;
  let acousticDone = 0;

  Object.entries(state.unitProgress).forEach(([key, prog]) => {
    if (!prog.completed) return;
    if (key.startsWith('BGIU_') || key.startsWith('EGIU_')) {
      grammarDone++;
    } else if (key.startsWith('OWS-EL_') || key.startsWith('OWS-INT_') || key.startsWith('OWS-ADV_')) {
      vocabDone++;
    } else if (key.startsWith('COLL-INT_') || key.startsWith('COLL-ADV_') || key.startsWith('PV-INT_') || key.startsWith('PV-ADV_')) {
      phraseDone++;
    } else if (key.startsWith('AAT_')) {
      acousticDone++;
    }
  });

  const grammarTotal = 258; // 113 + 145
  const vocabTotal = 300; // 100 + 100 + 100
  const phraseTotal = 250; // 60 + 60 + 70 + 60
  const acousticTotal = 20; // 20 AAT units
  const totalUnits = 828;
  const totalCompleted = grammarDone + vocabDone + phraseDone + acousticDone;

  const totalPercent = Math.round((totalCompleted / totalUnits) * 100);

  // Segment widths in proportion to 828 total
  const gPct = (grammarDone / totalUnits) * 100;
  const vPct = (vocabDone / totalUnits) * 100;
  const pPct = (phraseDone / totalUnits) * 100;
  const aPct = (acousticDone / totalUnits) * 100;

  return (
    <div
      onClick={onNavigateToStudio}
      title="Click to inspect Studio Velocity Analytics"
      className="group relative cursor-pointer w-full bg-[#FFFDF5] border-2 border-black rounded-xl p-2 neo-shadow-sm hover:bg-[#FFF3C4]/30 transition-all"
    >
      <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1 px-0.5">
        <span className="flex items-center gap-2 text-black">
          <span className="w-2 h-2 rounded-full bg-[#312E81] animate-pulse"></span>
          <span>CURRICULUM VELOCITY</span>
          <span className="text-black/50 font-normal">({totalCompleted} / {totalUnits} Units)</span>
        </span>
        <span className="font-bold text-black flex items-center gap-1 group-hover:text-[#312E81] transition-colors">
          <span>{totalPercent}%</span>
          <span className="text-[10px] text-black/50 underline">Studio ↗</span>
        </span>
      </div>

      {/* Multi-segment thin progress bar */}
      <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden flex border border-black/20">
        <div
          style={{ width: `${gPct}%` }}
          title={`Grammar: ${grammarDone}/${grammarTotal}`}
          className="h-full bg-[#FFCDD2] border-r border-black/20 transition-all duration-300"
        />
        <div
          style={{ width: `${vPct}%` }}
          title={`Vocabulary: ${vocabDone}/${vocabTotal}`}
          className="h-full bg-[#C8E6C9] border-r border-black/20 transition-all duration-300"
        />
        <div
          style={{ width: `${pPct}%` }}
          title={`Phraseology: ${phraseDone}/${phraseTotal}`}
          className="h-full bg-[#D1C4E9] border-r border-black/20 transition-all duration-300"
        />
        <div
          style={{ width: `${aPct}%` }}
          title={`Acoustics: ${acousticDone}/${acousticTotal}`}
          className="h-full bg-[#312E81] transition-all duration-300"
        />
      </div>

      {/* Micro-legend */}
      <div className="flex items-center justify-between text-[10px] font-mono text-black/70 mt-1.5 px-0.5">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-xs bg-[#FFCDD2] border border-black/30"></span>
          Grammar ({grammarDone}/{grammarTotal})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-xs bg-[#C8E6C9] border border-black/30"></span>
          Vocab ({vocabDone}/{vocabTotal})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-xs bg-[#D1C4E9] border border-black/30"></span>
          Phraseology ({phraseDone}/{phraseTotal})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-xs bg-[#312E81] border border-black/30"></span>
          Pronunciation ({acousticDone}/{acousticTotal})
        </span>
      </div>
    </div>
  );
};
