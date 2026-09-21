import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  PenTool,
  Play,
  Pause,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { playSound } from '../../services/audio';

interface OutputRitualProps {
  dayNumber: number;
  soundEnabled: boolean;
  vocalRestGuardEnabled: boolean;
  onCommitShadowingSession: (seconds: number) => void;
  onSaveDailySprint: (text: string, wordCount: number) => void;
  sprintAlreadyDone: boolean;
  loggedShadowingSeconds: number;
}

export const OutputRitual: React.FC<OutputRitualProps> = ({
  dayNumber,
  soundEnabled,
  vocalRestGuardEnabled,
  onCommitShadowingSession,
  onSaveDailySprint,
  sprintAlreadyDone,
  loggedShadowingSeconds,
}) => {
  // Acoustic Output Stopwatch State
  const [isShadowingRunning, setIsShadowingRunning] = useState(false);
  const [shadowingSeconds, setShadowingSeconds] = useState(0);
  const [showVocalRestAlert, setShowVocalRestAlert] = useState(false);
  const shadowingTimerRef = useRef<number | null>(null);

  // 5-Minute Micro-Writing Sprint State
  const [sprintTimeRemaining, setSprintTimeRemaining] = useState(300); // 5 mins
  const [isSprintRunning, setIsSprintRunning] = useState(false);
  const [sprintText, setSprintText] = useState('');
  const sprintTimerRef = useRef<number | null>(null);

  // Collapsible Resource Hub State
  const [isResourceHubOpen, setIsResourceHubOpen] = useState(false);

  // Shadowing Stopwatch Interval
  useEffect(() => {
    if (isShadowingRunning) {
      shadowingTimerRef.current = window.setInterval(() => {
        setShadowingSeconds((prev) => {
          const next = prev + 1;
          // Vocal Cord Rest Guard alert at 25 minutes (1500 seconds)
          if (vocalRestGuardEnabled && next === 1500) {
            setShowVocalRestAlert(true);
            playSound('rest', soundEnabled);
          }
          return next;
        });
      }, 1000);
    } else {
      if (shadowingTimerRef.current) clearInterval(shadowingTimerRef.current);
    }
    return () => {
      if (shadowingTimerRef.current) clearInterval(shadowingTimerRef.current);
    };
  }, [isShadowingRunning, soundEnabled, vocalRestGuardEnabled]);

  // Sprint Countdown Interval
  useEffect(() => {
    if (isSprintRunning) {
      sprintTimerRef.current = window.setInterval(() => {
        setSprintTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsSprintRunning(false);
            playSound('timer', soundEnabled);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (sprintTimerRef.current) clearInterval(sprintTimerRef.current);
    }
    return () => {
      if (sprintTimerRef.current) clearInterval(sprintTimerRef.current);
    };
  }, [isSprintRunning, soundEnabled]);

  const handleCommitShadowing = () => {
    if (shadowingSeconds > 0) {
      onCommitShadowingSession(shadowingSeconds);
      setShadowingSeconds(0);
      setIsShadowingRunning(false);
      setShowVocalRestAlert(false);
      playSound('complete', soundEnabled);
    }
  };

  const handleSaveSprint = () => {
    const trimmed = sprintText.trim();
    if (!trimmed) return;
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    onSaveDailySprint(trimmed, words);
    setSprintText('');
    setSprintTimeRemaining(300);
    setIsSprintRunning(false);
    playSound('complete', soundEnabled);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const wordCount = sprintText.trim().split(/\s+/).filter(Boolean).length;

  const authenticResources = [
    {
      name: 'NPR Life Kit (Podcast)',
      desc: 'High-speed natural colloquial discourse with transcripts',
      url: 'https://www.npr.org/podcasts/510338/life-kit',
      tag: 'Listening & Shadowing',
    },
    {
      name: 'Scientific American: 60-Second Science',
      desc: 'Rapid academic delivery & concise technical syntax',
      url: 'https://www.scientificamerican.com/podcasts/',
      tag: 'Acoustic Precision',
    },
    {
      name: 'TED-Ed Animations',
      desc: 'Rich thematic vocabulary & formal explanatory patterns',
      url: 'https://ed.ted.com/lessons',
      tag: 'Vocabulary In Context',
    },
    {
      name: 'Lex Fridman Podcast',
      desc: 'In-depth long-form dialogues on science, engineering & philosophy',
      url: 'https://lexfridman.com/podcast/',
      tag: 'Advanced Discourse',
    },
  ];

  return (
    <section className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-4 sm:p-5 neo-shadow mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-black/10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF2A5F] animate-pulse"></span>
          <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
            Day {dayNumber} Output Ritual (Pinned Active Section)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="indigo">High Cognitive Yield</Badge>
          <span className="text-xs font-mono text-black/60 hidden sm:inline">Min. 20m Output / Day</span>
        </div>
      </div>

      {/* 2-Column Grid: Left = Shadowing Output, Right = 5m Sprint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Module 1: Acoustic Output Stopwatch */}
        <div className="bg-black/2.5 border border-black/15 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-black uppercase">
                <Mic className="w-4 h-4 text-[#312E81]" />
                1. Free-Form Shadowing & Acoustics
              </span>
              <Badge variant="lavender" size="sm">
                Output Mode
              </Badge>
            </div>
            <p className="text-xs text-black/70 mb-3 leading-relaxed">
              Active vocal shadowing: match vowel tenseness, reduction, and word-linking out loud.
            </p>

            {/* Rest guard alert */}
            {showVocalRestAlert && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#FFF3C4] border border-black text-xs flex items-center gap-2 animate-bounce">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-semibold text-black">
                  25m Vocal Rest Guard: Pause, hydrate vocal cords, and rest 2 minutes.
                </span>
              </div>
            )}

            {/* Stopwatch Counter */}
            <div className="flex items-center justify-center py-3 bg-white/70 rounded-xl border border-black/10 mb-3">
              <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-black">
                {formatTime(shadowingSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isShadowingRunning ? (
              <Button
                variant="mint"
                size="sm"
                className="flex-1"
                icon={<Play className="w-3.5 h-3.5" />}
                onClick={() => setIsShadowingRunning(true)}
              >
                Start Shadowing
              </Button>
            ) : (
              <Button
                variant="cream"
                size="sm"
                className="flex-1"
                icon={<Pause className="w-3.5 h-3.5" />}
                onClick={() => setIsShadowingRunning(false)}
              >
                Pause
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              disabled={shadowingSeconds === 0}
              onClick={handleCommitShadowing}
            >
              Commit Session
            </Button>
          </div>

          {loggedShadowingSeconds > 0 && (
            <div className="mt-2 text-[11px] font-mono text-black/60 flex items-center justify-between">
              <span>Logged Today:</span>
              <span className="font-bold text-[#312E81]">
                {Math.round(loggedShadowingSeconds / 60)} mins active shadowing
              </span>
            </div>
          )}
        </div>

        {/* Module 2: 5-Minute Micro-Writing Sprint */}
        <div className="bg-black/2.5 border border-black/15 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-black uppercase">
                <PenTool className="w-4 h-4 text-[#FF2A5F]" />
                2. 5-Minute Micro-Writing Sprint
              </span>
              <span className="text-xs font-mono font-bold text-black bg-black/10 px-2 py-0.5 rounded-md">
                {formatTime(sprintTimeRemaining)}
              </span>
            </div>

            <p className="text-xs text-black/70 mb-2 leading-relaxed">
              Draft 30–50 words synthesizing a concept or real scenario from today's study.
            </p>

            <textarea
              value={sprintText}
              onChange={(e) => setSprintText(e.target.value)}
              placeholder="Start typing immediately upon pressing timer (Target: 30-50 words)..."
              rows={3}
              className="w-full bg-white/90 border border-black/20 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black resize-none leading-relaxed"
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-semibold ${
                  wordCount >= 30 ? 'text-emerald-700' : 'text-black/60'
                }`}
              >
                {wordCount} / 30-50 words
              </span>

              {sprintAlreadyDone && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-[#C8E6C9] px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {!isSprintRunning ? (
                <Button
                  variant="cream"
                  size="sm"
                  icon={<Play className="w-3 h-3" />}
                  onClick={() => setIsSprintRunning(true)}
                >
                  Start 5:00
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Pause className="w-3 h-3" />}
                  onClick={() => setIsSprintRunning(false)}
                >
                  Pause
                </Button>
              )}

              <Button
                variant="mint"
                size="sm"
                disabled={wordCount < 5}
                onClick={handleSaveSprint}
              >
                Save Sprint
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Curated Authentic Immersion Hub (Collapsible) */}
      <div className="mt-4 pt-3 border-t border-black/10">
        <button
          onClick={() => setIsResourceHubOpen(!isResourceHubOpen)}
          className="w-full flex items-center justify-between text-xs font-mono font-semibold text-black/80 hover:text-black py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-[#312E81]" />
            <span>Curated Authentic Immersion Audio/Video Hub</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[11px] text-black/50">
              {isResourceHubOpen ? 'Hide Resources' : 'Show 4 Authentic Feeds'}
            </span>
            {isResourceHubOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {isResourceHubOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 animate-in fade-in duration-150">
            {authenticResources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between p-2.5 rounded-xl bg-black/2.5 hover:bg-[#FFF3C4]/60 border border-black/10 transition-colors group"
              >
                <div>
                  <div className="text-xs font-bold text-black group-hover:text-[#312E81] flex items-center gap-1.5">
                    <span>{res.name}</span>
                    <ExternalLink className="w-3 h-3 text-black/40 group-hover:text-black" />
                  </div>
                  <div className="text-[11px] text-black/60 mt-0.5">{res.desc}</div>
                </div>
                <Badge variant="lavender" size="sm" className="shrink-0">
                  {res.tag}
                </Badge>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
