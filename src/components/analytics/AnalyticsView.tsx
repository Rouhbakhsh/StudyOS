import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Layers,
  Brain,
  Clock,
  Mic,
  PenTool,
  Headphones,
  BookOpen,
  CheckCircle2,
  Calendar,
  BookMarked,
  AlertOctagon,
  Award,
} from 'lucide-react';
import { AppState } from '../../types';
import { Badge } from '../common/Badge';

interface AnalyticsViewProps {
  state: AppState;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ state }) => {
  // 1. Core Skills Progress
  let grammarDone = 0;
  let vocabDone = 0;
  let phraseDone = 0;
  let acousticDone = 0;

  Object.entries(state.unitProgress).forEach(([key, prog]) => {
    if (!prog.completed) return;
    if (key.startsWith('BGIU_') || key.startsWith('EGIU_')) grammarDone++;
    else if (key.startsWith('OWS-EL_') || key.startsWith('OWS-INT_') || key.startsWith('OWS-ADV_')) vocabDone++;
    else if (key.startsWith('COLL-INT_') || key.startsWith('COLL-ADV_') || key.startsWith('PV-INT_') || key.startsWith('PV-ADV_')) phraseDone++;
    else if (key.startsWith('AAT_')) acousticDone++;
  });

  const grammarTotal = 258;
  const vocabTotal = 300;
  const phraseTotal = 250;
  const acousticTotal = 20;
  const totalUnits = 828;
  const totalCompleted = grammarDone + vocabDone + phraseDone + acousticDone;
  const masterPct = Math.round((totalCompleted / totalUnits) * 100);

  // 2. Curriculum Calendar & Weekly Velocity
  const currentDay = state.settings.currentActiveDay;
  const currentWeek = Math.ceil(currentDay / 6);
  const weekStartDay = (currentWeek - 1) * 6 + 1;
  const weekDays = [0, 1, 2, 3, 4, 5].map((offset) => weekStartDay + offset);

  // Units completed in active week
  let activeWeekUnitsDone = 0;
  Object.values(state.unitProgress).forEach((prog) => {
    if (prog.completed) activeWeekUnitsDone++;
  });

  // 3. Time Breakdown & Input/Output
  let outputSeconds = 0;
  let inputSeconds = 0;
  let shadowingSeconds = 0;
  let writingSeconds = 0;
  let listeningSeconds = 0;
  let readingSeconds = 0;

  state.timerSessions.forEach((sess) => {
    if (sess.mode === 'output') outputSeconds += sess.durationSeconds;
    else inputSeconds += sess.durationSeconds;

    if (sess.skill === 'Shadowing') shadowingSeconds += sess.durationSeconds;
    else if (sess.skill === 'Writing') writingSeconds += sess.durationSeconds;
    else if (sess.skill === 'Listening') listeningSeconds += sess.durationSeconds;
    else if (sess.skill === 'Reading') readingSeconds += sess.durationSeconds;
  });

  const totalStudySeconds = outputSeconds + inputSeconds;
  const totalStudyMinutes = Math.round(totalStudySeconds / 60);
  const outputRatio = totalStudySeconds > 0 ? Math.round((outputSeconds / totalStudySeconds) * 100) : 50;
  const inputRatio = 100 - outputRatio;

  // 4. Memory Bank Health (SM-2)
  const todayStr = new Date().toISOString().split('T')[0];
  const dueCards = state.flashcards.filter((c) => !c.dueDate || c.dueDate <= todayStr);
  const matureCards = state.flashcards.filter((c) => (c.interval || 0) >= 21);
  const learningCards = state.flashcards.filter((c) => (c.interval || 0) < 21);
  const totalCards = state.flashcards.length;
  const retentionRate = totalCards > 0 ? Math.round((matureCards.length / totalCards) * 100) : 0;

  // 5. Production & Writing Velocity
  const totalSprints = state.sprints.length;
  const totalWordsWritten = state.sprints.reduce((acc, s) => acc + s.wordCount, 0);
  const avgWordsPerSprint = totalSprints > 0 ? Math.round(totalWordsWritten / totalSprints) : 0;

  // 6. Lexicon CEFR Distribution
  const lexiconCount = state.lexicon.length;
  const levelCounts: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
  state.lexicon.forEach((w) => {
    if (levelCounts[w.level] !== undefined) levelCounts[w.level]++;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Macro Curriculum Velocity Card */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="indigo" size="md">
                Master Analytics
              </Badge>
              <Badge variant="neutral" size="sm">
                Week {currentWeek} of 24
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1.5 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-[#312E81]" />
              <span>Skill Mastery & Curriculum Velocity</span>
            </h1>
            <p className="text-xs text-black/70 font-mono mt-0.5">
              Comprehensive telemetry across 828 textbook units, spaced repetition, and productive output
            </p>
          </div>

          <div className="text-right">
            <div className="text-4xl font-black font-mono text-black">
              {masterPct}%
            </div>
            <div className="text-xs font-mono text-black/60">
              {totalCompleted} of {totalUnits} Units Cleared
            </div>
          </div>
        </div>

        {/* Phase Roadmap Progress Bar */}
        <div className="mt-4 bg-black/2.5 border border-black/10 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-black">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-black/60" />
              Macro Phase Transition Horizon
            </span>
            <span>Day {currentDay} of 144</span>
          </div>

          <div className="w-full h-3.5 bg-black/10 rounded-full overflow-hidden flex border border-black/20">
            <div
              style={{ width: `${Math.min(100, (totalCompleted / 250) * 33.33)}%` }}
              className="h-full bg-[#FFCDD2] border-r border-black/20 transition-all duration-500"
              title="Phase 1: A1 → A2"
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, (totalCompleted - 250) / 300) * 33.33)}%` }}
              className="h-full bg-[#C8E6C9] border-r border-black/20 transition-all duration-500"
              title="Phase 2: B1 → B2"
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, (totalCompleted - 550) / 278) * 33.34)}%` }}
              className="h-full bg-[#D1C4E9] transition-all duration-500"
              title="Phase 3: B2 → C1"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-black/70 pt-1">
            <span className={currentWeek <= 8 ? 'font-bold text-black' : ''}>
              Phase 1: Foundation (W1–8)
            </span>
            <span className={currentWeek > 8 && currentWeek <= 16 ? 'font-bold text-black' : ''}>
              Phase 2: Fluency (W9–16)
            </span>
            <span className={currentWeek > 16 ? 'font-bold text-black' : ''}>
              Phase 3: Mastery (W17–24)
            </span>
          </div>
        </div>
      </div>

      {/* 2. 4 Core Skill Mastery Domains */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-black flex items-center gap-2">
            <Award className="w-4 h-4 text-black" />
            <span>4 Core Skill Mastery Domains (828 Units)</span>
          </h2>
          <span className="text-xs font-mono text-black/60">Deliberate Practice Split</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grammar */}
          <div className="bg-black/2.5 border border-black/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-black flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FFCDD2] border border-black/30"></span>
                Grammar Mastery (BGIU + EGIU)
              </span>
              <span className="text-black">
                {grammarDone} / {grammarTotal} ({Math.round((grammarDone / grammarTotal) * 100)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden border border-black/20">
              <div
                style={{ width: `${(grammarDone / grammarTotal) * 100}%` }}
                className="h-full bg-[#FFCDD2] transition-all duration-300"
              />
            </div>
            <p className="text-[11px] text-black/60">
              Syntax, auxiliary inversions, conditionals, passive structures & reported speech.
            </p>
          </div>

          {/* Vocabulary */}
          <div className="bg-black/2.5 border border-black/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-black flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#C8E6C9] border border-black/30"></span>
                Core Vocabulary (OWS Elementary → Advanced)
              </span>
              <span className="text-black">
                {vocabDone} / {vocabTotal} ({Math.round((vocabDone / vocabTotal) * 100)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden border border-black/20">
              <div
                style={{ width: `${(vocabDone / vocabTotal) * 100}%` }}
                className="h-full bg-[#C8E6C9] transition-all duration-300"
              />
            </div>
            <p className="text-[11px] text-black/60">
              High-yield lexical items, synonyms, word families & formal academic register.
            </p>
          </div>

          {/* Phraseology */}
          <div className="bg-black/2.5 border border-black/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-black flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D1C4E9] border border-black/30"></span>
                Phraseology & Collocations (COLL + PV)
              </span>
              <span className="text-black">
                {phraseDone} / {phraseTotal} ({Math.round((phraseDone / phraseTotal) * 100)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden border border-black/20">
              <div
                style={{ width: `${(phraseDone / phraseTotal) * 100}%` }}
                className="h-full bg-[#D1C4E9] transition-all duration-300"
              />
            </div>
            <p className="text-[11px] text-black/60">
              Fixed collocations, intensifying adverbs, phrasal verbs & native idiomatic flow.
            </p>
          </div>

          {/* Acoustics */}
          <div className="bg-black/2.5 border border-black/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-black flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#312E81]"></span>
                Acoustics & Intonation (American Accent Training)
              </span>
              <span className="text-black">
                {acousticDone} / {acousticTotal} ({Math.round((acousticDone / acousticTotal) * 100)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden border border-black/20">
              <div
                style={{ width: `${(acousticDone / acousticTotal) * 100}%` }}
                className="h-full bg-[#312E81] transition-all duration-300"
              />
            </div>
            <p className="text-[11px] text-black/60">
              Flap /t/, vowel contrasts, word linking, reduction & rhythmic syllable stress.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Memory Bank (SM-2) & Cognitive Time Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Memory Retention (SM-2 Engine) */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/10">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#312E81]" />
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-black">
                Memory Retention & SM-2 Health
              </h2>
            </div>
            <Badge variant="indigo" size="sm">
              {retentionRate}% Consolidated
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-black/2.5 border border-black/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-mono text-black/60 uppercase">Total Cards</div>
              <div className="text-xl font-mono font-black text-black mt-0.5">{totalCards}</div>
            </div>
            <div className="bg-[#FFF3C4]/40 border border-black/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-mono text-amber-900 uppercase">Due Today</div>
              <div className="text-xl font-mono font-black text-black mt-0.5">{dueCards.length}</div>
            </div>
            <div className="bg-[#C8E6C9]/40 border border-black/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-mono text-emerald-900 uppercase">Mature (21d+)</div>
              <div className="text-xl font-mono font-black text-black mt-0.5">{matureCards.length}</div>
            </div>
          </div>

          {/* Retention Visual Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono text-black/70">
              <span>Learning ({learningCards.length})</span>
              <span>Long-term Memory ({matureCards.length})</span>
            </div>
            <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden flex border border-black/20">
              <div
                style={{ width: `${totalCards > 0 ? (learningCards.length / totalCards) * 100 : 0}%` }}
                className="h-full bg-[#FFF3C4]"
                title="Learning"
              />
              <div
                style={{ width: `${totalCards > 0 ? (matureCards.length / totalCards) * 100 : 0}%` }}
                className="h-full bg-[#C8E6C9]"
                title="Mature"
              />
            </div>
          </div>

          <div className="p-3 bg-black/2.5 rounded-xl border border-black/10 flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1.5 text-black/70">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-700" />
              Unresolved Mistakes Vault
            </span>
            <span className="font-bold text-black">
              {state.mistakes.filter((m) => m.status === 'unresolved').length} items
            </span>
          </div>
        </div>

        {/* Right: Cognitive Time & Output Balance */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/10">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#FF2A5F]" />
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-black">
                Time Investment & Output Ratio
              </h2>
            </div>
            <Badge variant={outputRatio >= 50 ? 'mint' : 'rose'} size="sm">
              {outputRatio}% Output
            </Badge>
          </div>

          {/* Time by Skills Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl border border-black/10 bg-black/2.5 text-center">
              <Mic className="w-4 h-4 text-emerald-800 mx-auto" />
              <div className="text-[10px] font-mono text-black/60 mt-1">Shadowing</div>
              <div className="text-sm font-mono font-bold text-black mt-0.5">{Math.round(shadowingSeconds / 60)}m</div>
            </div>

            <div className="p-2.5 rounded-xl border border-black/10 bg-black/2.5 text-center">
              <PenTool className="w-4 h-4 text-emerald-800 mx-auto" />
              <div className="text-[10px] font-mono text-black/60 mt-1">Writing</div>
              <div className="text-sm font-mono font-bold text-black mt-0.5">{Math.round(writingSeconds / 60)}m</div>
            </div>

            <div className="p-2.5 rounded-xl border border-black/10 bg-black/2.5 text-center">
              <Headphones className="w-4 h-4 text-indigo-800 mx-auto" />
              <div className="text-[10px] font-mono text-black/60 mt-1">Listening</div>
              <div className="text-sm font-mono font-bold text-black mt-0.5">{Math.round(listeningSeconds / 60)}m</div>
            </div>

            <div className="p-2.5 rounded-xl border border-black/10 bg-black/2.5 text-center">
              <BookOpen className="w-4 h-4 text-indigo-800 mx-auto" />
              <div className="text-[10px] font-mono text-black/60 mt-1">Reading</div>
              <div className="text-sm font-mono font-bold text-black mt-0.5">{Math.round(readingSeconds / 60)}m</div>
            </div>
          </div>

          {/* Ratio Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono text-black/70">
              <span>🗣️ Active Output: {Math.round(outputSeconds / 60)}m ({outputRatio}%)</span>
              <span>📖 Passive Input: {Math.round(inputSeconds / 60)}m ({inputRatio}%)</span>
            </div>
            <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden flex border-2 border-black">
              <div style={{ width: `${outputRatio}%` }} className="h-full bg-[#C8E6C9]" />
              <div style={{ width: `${inputRatio}%` }} className="h-full bg-[#D1C4E9]" />
            </div>
            <div className="text-[11px] font-mono text-black/50 text-right">
              Total Logged: {totalStudyMinutes} mins
            </div>
          </div>
        </div>
      </div>

      {/* 4. Production & Lexicon Growth Card */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-[#312E81]" />
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-black">
              Production Velocity & Lexicon Master Bank
            </h2>
          </div>
          <span className="text-xs font-mono text-black/60">CEFR Lexical Footprint</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Writing Stats */}
          <div className="bg-black/2.5 border border-black/10 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-mono font-semibold text-black/60">Writing Sprints</div>
            <div className="text-2xl font-mono font-black text-black">{totalSprints} Sessions</div>
            <div className="text-xs font-mono text-black/60 pt-1">
              {totalWordsWritten} total words ({avgWordsPerSprint} avg/session)
            </div>
          </div>

          {/* Lexicon Total */}
          <div className="bg-black/2.5 border border-black/10 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-mono font-semibold text-black/60">Master Lexicon Bank</div>
            <div className="text-2xl font-mono font-black text-black">{lexiconCount} Words</div>
            <div className="text-xs font-mono text-black/60 pt-1">
              Indexed for active production & recall
            </div>
          </div>

          {/* CEFR Level Breakdown */}
          <div className="bg-black/2.5 border border-black/10 rounded-2xl p-4 flex items-center justify-between">
            {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map((lvl) => (
              <div key={lvl} className="text-center">
                <span className="text-[10px] font-mono font-bold text-black/50">{lvl}</span>
                <div className="text-base font-mono font-black text-black mt-0.5">
                  {levelCounts[lvl] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};