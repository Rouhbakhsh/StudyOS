import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Trash2,
  Check,
  Clock,
  BookOpen,
  FileText,
} from 'lucide-react';
import { AppState, SprintEntry } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { playSound } from '../../services/audio';

interface SprintsViewProps {
  state: AppState;
  onCommitSprint: (sprint: SprintEntry) => void;
  onDeleteSprint: (id: string) => void;
}

export const SprintsView: React.FC<SprintsViewProps> = ({
  state,
  onCommitSprint,
  onDeleteSprint,
}) => {
  // Runner State
  const [durationMinutes, setDurationMinutes] = useState<number>(5);
  const [timeRemaining, setTimeRemaining] = useState<number>(300);
  const [isRunning, setIsRunning] = useState(false);
  const [sprintTitle, setSprintTitle] = useState('');
  const [sprintText, setSprintText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // Stats calculation
  const totalSprints = state.sprints.length;
  const totalWords = state.sprints.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const avgWordsPerSession = totalSprints > 0 ? Math.round(totalWords / totalSprints) : 0;

  // Handle countdown
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playSound('timer', state.settings.soundEnabled);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, state.settings.soundEnabled]);

  const handleSelectDuration = (mins: number) => {
    setDurationMinutes(mins);
    setTimeRemaining(mins * 60);
    setIsRunning(false);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeRemaining(durationMinutes * 60);
  };

  const currentWords = sprintText.trim().split(/\s+/).filter(Boolean).length;

  const handleCommit = () => {
    if (!sprintText.trim()) return;

    const newSprint: SprintEntry = {
      id: `sprint-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: sprintTitle.trim() || `Free Sprint (${durationMinutes}m)`,
      prompt: '',
      text: sprintText.trim(),
      wordCount: currentWords,
      durationMinutes,
      createdAt: new Date().toISOString(),
      origin: 'FREE_SPRINT',
    };

    onCommitSprint(newSprint);
    playSound('complete', state.settings.soundEnabled);

    // Reset runner form
    setSprintText('');
    setSprintTitle('');
    setTimeRemaining(durationMinutes * 60);
    setIsRunning(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getOriginBadge = (sprint: SprintEntry) => {
    if (sprint.origin === 'DAILY') {
      return (
        <Badge variant="coral" size="sm">
          DAILY • DAY {sprint.dayNumber || 1}
        </Badge>
      );
    }
    if (sprint.origin === 'STUDIO_FOCUS') {
      return (
        <Badge variant="lavender" size="sm">
          STUDIO FOCUS
        </Badge>
      );
    }
    return (
      <Badge variant="mint" size="sm">
        FREE SPRINT
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-black/60 uppercase">
              Total Sprints
            </div>
            <div className="text-3xl font-black font-mono text-black mt-1">
              {totalSprints}
            </div>
            <div className="text-xs font-mono text-black/70 mt-0.5">
              Production Entries
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFCDD2] border-2 border-black flex items-center justify-center neo-shadow-sm">
            <PenTool className="w-6 h-6 text-black" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-black/60 uppercase">
              Total Words Written
            </div>
            <div className="text-3xl font-black font-mono text-black mt-1">
              {totalWords.toLocaleString()}
            </div>
            <div className="text-xs font-mono text-emerald-800 font-semibold mt-0.5">
              Cumulative Output
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#C8E6C9] border-2 border-black flex items-center justify-center neo-shadow-sm">
            <FileText className="w-6 h-6 text-black" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 neo-shadow flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-black/60 uppercase">
              Avg / Session
            </div>
            <div className="text-3xl font-black font-mono text-black mt-1">
              {avgWordsPerSession} <span className="text-base text-black/50 font-normal">words</span>
            </div>
            <div className="text-xs font-mono text-black/70 mt-0.5">
              Deliberate Output Target
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#D1C4E9] border-2 border-black flex items-center justify-center neo-shadow-sm">
            <Clock className="w-6 h-6 text-black" />
          </div>
        </div>
      </div>

      {/* 2. Timed Free-Writing Runner */}
      <section className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow space-y-4">
        {/* Runner Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="coral" size="md">
                Active Deliberate Output
              </Badge>
              <Badge variant="neutral" size="sm">
                No-Edit Stream of Consciousness
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-black font-sans mt-1 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#FF2A5F]" />
              <span>Timed Free-Writing Runner</span>
            </h2>
          </div>

          {/* Duration Selector & Timer Display */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl border border-black/10">
              {[3, 5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleSelectDuration(mins)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                    durationMinutes === mins
                      ? 'bg-black text-white neo-shadow-sm'
                      : 'bg-transparent text-black hover:bg-black/10'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            <div className="font-mono text-xl font-black text-black bg-[#FFF3C4] px-3.5 py-1.5 rounded-xl border-2 border-black neo-shadow-sm">
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        {/* Writing Input Fields */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Sprint Topic / Title (optional)..."
            value={sprintTitle}
            onChange={(e) => setSprintTitle(e.target.value)}
            className="w-full bg-white border border-black/20 rounded-xl px-3.5 py-2 text-xs font-semibold text-black focus:outline-none focus:border-black"
          />

          <textarea
            rows={7}
            placeholder="Write continuously without stopping to backspace or edit. Let grammar structures, sentence varieties, and learned collocations flow naturally..."
            value={sprintText}
            onChange={(e) => setSprintText(e.target.value)}
            className="w-full bg-white border border-black/20 rounded-2xl p-4 text-sm text-black focus:outline-none focus:border-black resize-y leading-relaxed"
          />
        </div>

        {/* Runner Controls & Live Word Counter */}
        <div className="pt-2 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-xs font-bold ${
                currentWords >= 30 ? 'text-emerald-800' : 'text-black/60'
              }`}
            >
              {currentWords} Words Logged
            </span>
            {currentWords >= 50 && (
              <Badge variant="mint" size="sm">
                Target Met (50+)
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button
                variant="mint"
                size="md"
                icon={<Play className="w-4 h-4" />}
                onClick={() => setIsRunning(true)}
              >
                Start Timer
              </Button>
            ) : (
              <Button
                variant="cream"
                size="md"
                icon={<Pause className="w-4 h-4" />}
                onClick={() => setIsRunning(false)}
              >
                Pause
              </Button>
            )}

            <button
              onClick={handleResetTimer}
              title="Reset Timer"
              aria-label="Reset Timer"
              className="p-2 rounded-xl border-2 border-black bg-white hover:bg-black/5 neo-shadow-sm neo-btn cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-black" />
            </button>

            <Button
              variant="coral"
              size="md"
              disabled={currentWords < 3}
              onClick={handleCommit}
            >
              Commit Sprint to Archive
            </Button>
          </div>
        </div>
      </section>

      {/* 3. Historical Sprints Archive */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-black uppercase tracking-wider font-mono flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-black" />
            <span>Written Production Archive ({state.sprints.length})</span>
          </h2>
          <span className="text-xs font-mono text-black/60">Deliberate Written Feed</span>
        </div>

        {state.sprints.length === 0 ? (
          <div className="text-center py-12 bg-[#FFFDF5] border-2 border-black rounded-3xl neo-shadow p-6 space-y-3">
            <PenTool className="w-10 h-10 text-black/30 mx-auto" />
            <h3 className="text-base font-bold text-black">No Sprints Archived Yet</h3>
            <p className="text-xs font-mono text-black/60 max-w-sm mx-auto">
              Start your first timed sprint above to build your deliberate written portfolio.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.sprints.map((sprint) => (
              <article
                key={sprint.id}
                className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-5 sm:p-6 neo-shadow space-y-3"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-black font-sans">
                      {sprint.title}
                    </h3>
                    {getOriginBadge(sprint)}
                    <Badge variant="neutral" size="sm">
                      {sprint.wordCount} words
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-black/60">
                    <span>{new Date(sprint.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleCopy(sprint.text, sprint.id)}
                      title="Copy Sprint Text"
                      aria-label="Copy Sprint Text"
                      className="p-1 rounded-lg border border-black/20 bg-white hover:bg-[#FFF3C4] cursor-pointer"
                    >
                      {copiedId === sprint.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-black" />
                      )}
                    </button>
                    <button
                      onClick={() => onDeleteSprint(sprint.id)}
                      title="Delete Sprint"
                      aria-label="Delete Sprint"
                      className="p-1 rounded-lg border border-black/20 bg-white hover:bg-[#FFCDD2] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-black" />
                    </button>
                  </div>
                </div>

                {sprint.prompt && (
                  <div className="text-xs font-mono text-black/60 italic bg-black/2.5 p-2 rounded-xl border border-black/5">
                    Prompt: "{sprint.prompt}"
                  </div>
                )}

                <div className="text-xs sm:text-sm text-black leading-relaxed font-sans whitespace-pre-wrap">
                  {sprint.text}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};