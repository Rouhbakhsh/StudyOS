import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarCheck, HardDrive, Rocket, Upload, AlertTriangle } from 'lucide-react';
import { AppState } from '../../types';
import { parseBackupFile } from '../../services/storage';
import { playSound } from '../../services/audio';
import { Logo } from './Logo';

interface WelcomeScreenProps {
  onStart: (learnerName: string) => void;
  onRestore: (state: AppState) => void;
}

type Step = 'welcome' | 'journey' | 'launch';

const PHASES = [
  {
    label: 'Phase 1',
    weeks: 'Weeks 1–8',
    level: 'A1 → A2',
    tone: 'bg-[#C8E6C9]',
    books: ['Basic Grammar in Use', 'Oxford Word Skills Elementary', 'American Accent Training'],
  },
  {
    label: 'Phase 2',
    weeks: 'Weeks 9–16',
    level: 'B1 → B2',
    tone: 'bg-[#D1C4E9]',
    books: ['English Grammar in Use', 'Oxford Word Skills Intermediate', 'Collocations & Phrasal Verbs in Use'],
  },
  {
    label: 'Phase 3',
    weeks: 'Weeks 17–24',
    level: 'B2 → C1',
    tone: 'bg-[#FFF3C4]',
    books: ['English Grammar in Use (advanced units)', 'Oxford Word Skills Advanced', 'Advanced Collocations & Phrasal Verbs'],
  },
];

// جهت پرتاب ستاره‌های کوچک دور لوگو در لحظه شروع
const BURST = [
  [-150, -90], [150, -100], [-180, 20], [180, 30], [-110, 120], [120, 130], [0, -160], [0, 165],
];

const LAUNCH_DURATION_MS = 2000;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onRestore }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const trimmedName = name.trim();

  useEffect(() => {
    if (step !== 'launch') return;
    const timer = window.setTimeout(() => onStartRef.current(trimmedName), LAUNCH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [step, trimmedName]);

  const handleLaunch = () => {
    playSound('complete', true);
    setStep('launch');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setRestoreError(null);
      const restored = await parseBackupFile(file);
      onRestore(restored);
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : 'This backup could not be restored.');
    }
  };

  if (step === 'launch') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="relative">
          {BURST.map(([dx, dy], i) => (
            <svg
              key={i}
              viewBox="0 0 100 100"
              className="anim-burst absolute left-1/2 top-1/2 -ml-4 -mt-4 w-8 h-8"
              style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${350 + i * 40}ms` } as React.CSSProperties}
              aria-hidden="true"
            >
              <path
                fill={i % 2 ? '#FACC15' : '#312E81'}
                stroke="#000"
                strokeWidth="6"
                strokeLinejoin="round"
                d="M50 6 Q56 44 94 50 Q56 56 50 94 Q44 56 6 50 Q44 44 50 6 Z"
              />
            </svg>
          ))}
          <Logo className="anim-pop w-36 h-36 sm:w-44 sm:h-44 relative" animateStar />
        </div>
        <h1 className="anim-rise mt-8 text-4xl sm:text-5xl font-black tracking-tight text-black" style={{ animationDelay: '450ms' }}>
          Day 1 begins now.
        </h1>
        <p className="anim-rise mt-3 font-mono text-sm text-black/70" style={{ animationDelay: '650ms' }}>
          {trimmedName ? `Let's go, ${trimmedName}.` : "Let's go."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div key={step} className="anim-rise w-full max-w-3xl bg-[#FFFDF5] border-2 border-black rounded-3xl neo-shadow-lg p-6 sm:p-10">
        {step === 'welcome' ? (
          <div className="space-y-7">
            <div className="flex items-center gap-4">
              <Logo className="anim-pop w-16 h-16 sm:w-20 sm:h-20 shrink-0" animateStar />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black/60">
                Welcome to StudyOS
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-black leading-[1.05]">
                Your road to C1
                <br />
                starts today.
              </h1>
              <p className="text-base text-black/70 max-w-xl">
                144 days, three phases, and one clear mission every day. Let's set up your plan.
              </p>
            </div>

            <div className="space-y-2 max-w-md">
              <label htmlFor="learner-name" className="block text-sm font-bold text-black">
                What should we call you?
              </label>
              <input
                id="learner-name"
                type="text"
                value={name}
                maxLength={40}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setStep('journey');
                }}
                placeholder="Your first name (optional)"
                className="w-full px-4 py-3 rounded-2xl border-2 border-black bg-white text-base font-semibold outline-none focus:bg-[#FFF3C4] neo-shadow-sm transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('journey')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-black bg-[#312E81] text-white text-base font-bold neo-shadow neo-btn cursor-pointer hover:bg-[#3B37A0]"
              >
                See my plan
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-black/70 hover:text-black hover:bg-black/5 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                Restore from a backup
              </button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
            </div>

            <p className="text-xs font-mono text-black/50">
              Moving from the web version? Export a backup there (Config → Export JSON Vault) and restore it here.
            </p>

            {restoreError && (
              <div className="text-xs font-mono text-rose-950 bg-[#FFCDD2] p-3 rounded-xl border-2 border-black flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-7">
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black/60">
                Your 144-day plan
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">
                {trimmedName ? `Here's the road ahead, ${trimmedName}.` : "Here's the road ahead."}
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PHASES.map((phase, i) => (
                <div
                  key={phase.label}
                  className={`anim-rise ${phase.tone} border-2 border-black rounded-2xl p-4 neo-shadow-sm`}
                  style={{ animationDelay: `${120 + i * 110}ms` }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase text-black/70">{phase.label}</span>
                    <span className="font-mono text-[11px] text-black/60">{phase.weeks}</span>
                  </div>
                  <div className="text-2xl font-black text-black mt-1">{phase.level}</div>
                  <ul className="mt-2 space-y-1">
                    {phase.books.map((book) => (
                      <li key={book} className="text-xs text-black/75 leading-snug">
                        {book}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border-2 border-black/80 rounded-2xl p-4">
                <div className="font-mono text-[11px] font-bold uppercase text-black/60">Days 1–5 · Missions</div>
                <p className="text-sm text-black/80 mt-1">
                  Grammar, vocabulary, and accent or phrase work, plus a short daily output ritual.
                </p>
              </div>
              <div className="bg-white border-2 border-black/80 rounded-2xl p-4">
                <div className="font-mono text-[11px] font-bold uppercase text-black/60">Day 6 · Consolidation</div>
                <p className="text-sm text-black/80 mt-1">
                  Review your cards and mistakes, then lock it all in with shadowing.
                </p>
              </div>
            </div>

            <ul className="space-y-2.5">
              <li className="flex items-start gap-3 text-sm text-black/80">
                <CalendarCheck className="w-5 h-5 shrink-0 text-[#312E81] mt-0.5" />
                <span>
                  Missed a day? Your plan moves forward on its own. Nothing gets skipped, and you'll see what's
                  waiting when you're back.
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm text-black/80">
                <HardDrive className="w-5 h-5 shrink-0 text-[#312E81] mt-0.5" />
                <span>Your progress is saved on this computer, with a fresh backup every day.</span>
              </li>
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('welcome')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-black/70 hover:text-black hover:bg-black/5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleLaunch}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl border-2 border-black bg-[#FACC15] text-black text-lg font-black neo-shadow neo-btn cursor-pointer hover:bg-[#FDE047]"
              >
                <Rocket className="w-5 h-5" />
                Start Day 1
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;
