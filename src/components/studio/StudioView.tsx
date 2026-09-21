import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Clock,
  Flame,
  AlertTriangle,
  PenTool,
  BookOpen,
  Headphones,
  Mic,
  Zap,
  History,
  X,
  Calendar,
} from 'lucide-react';
import { AppState, TimerSession, SprintEntry } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { playSound } from '../../services/audio';

interface StudioViewProps {
  state: AppState;
  onCommitTimerSession: (session: TimerSession) => void;
  onSaveSprintFromStudio: (sprint: SprintEntry) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({
  state,
  onCommitTimerSession,
  onSaveSprintFromStudio,
}) => {
  // Calculate Output vs Input minutes
  let outputSeconds = 0;
  let inputSeconds = 0;

  state.timerSessions.forEach((sess) => {
    if (sess.mode === 'output') outputSeconds += sess.durationSeconds;
    else inputSeconds += sess.durationSeconds;
  });

  const totalStudySeconds = outputSeconds + inputSeconds;
  const totalStudyMinutes = Math.round(totalStudySeconds / 60);
  const outputMinutes = Math.round(outputSeconds / 60);
  const inputMinutes = Math.round(inputSeconds / 60);

  const outputRatio = totalStudySeconds > 0 ? Math.round((outputSeconds / totalStudySeconds) * 100) : 50;
  const inputRatio = 100 - outputRatio;

  // Active Focus Stopwatch
  type SkillMode = 'Reading' | 'Listening' | 'Shadowing' | 'Writing';
  const [selectedSkill, setSelectedSkill] = useState<SkillMode>('Shadowing');
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const stopwatchRef = useRef<number | null>(null);

  // Dynamic Session Detail Note for all 4 skills
  const [sessionDetailNote, setSessionDetailNote] = useState('');
  const [writingBridgeText, setWritingBridgeText] = useState('');

  // Selected session for detail inspection modal
  const [inspectingSession, setInspectingSession] = useState<TimerSession | null>(null);

  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchRef.current = window.setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    }
    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, [isStopwatchRunning]);

  const handleCommitSession = () => {
    if (stopwatchSeconds < 3) return;

    const mode = selectedSkill === 'Shadowing' || selectedSkill === 'Writing' ? 'output' : 'input';

    const session: TimerSession = {
      id: `timer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      mode,
      skill: selectedSkill,
      durationSeconds: stopwatchSeconds,
      timestamp: new Date().toISOString(),
      note: sessionDetailNote.trim() || undefined,
    };

    onCommitTimerSession(session);

    // If writing skill was selected and text written, bridge to sprints
    if (selectedSkill === 'Writing' && writingBridgeText.trim()) {
      const words = writingBridgeText.trim().split(/\s+/).filter(Boolean).length;
      const sprint: SprintEntry = {
        id: `sprint-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: sessionDetailNote.trim() || 'Studio Focus Writing Session',
        prompt: 'Studio deliberate written production',
        text: writingBridgeText.trim(),
        wordCount: words,
        durationMinutes: Math.max(1, Math.round(stopwatchSeconds / 60)),
        createdAt: new Date().toISOString(),
        origin: 'STUDIO_FOCUS',
      };
      onSaveSprintFromStudio(sprint);
      setWritingBridgeText('');
    }

    setSessionDetailNote('');
    setStopwatchSeconds(0);
    setIsStopwatchRunning(false);
    playSound('complete', state.settings.soundEnabled);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getSkillPlaceholder = (skill: SkillMode) => {
    switch (skill) {
      case 'Listening':
        return 'e.g. Podcast: Luke\'s English Podcast Ep. 810, NPR Life Kit, or YouTube Video Title...';
      case 'Reading':
        return 'e.g. Book: Atomic Habits Ch. 3, The Economist editorial, or BBC article...';
      case 'Shadowing':
        return 'e.g. Speech: Steve Jobs Stanford Commencement, TED-Ed video, or dialog drill...';
      case 'Writing':
        return 'e.g. Writing Topic / Essay Prompt / Paragraph Goal...';
    }
  };

  const isLowOutputAlert = totalStudyMinutes >= 15 && outputRatio < 50;

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Studio Header Banner */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="indigo" size="md">
                Focus Studio
              </Badge>
              <Badge variant="neutral" size="sm">
                Active Deliberate Practice
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1.5 flex items-center gap-2">
              <Zap className="w-7 h-7 text-[#312E81]" />
              <span>Multi-Skill Focus Studio</span>
            </h1>
            <p className="text-xs text-black/70 font-mono mt-0.5">
              Live practice tracking • Detail logging for all 4 skills • Permanent session archive
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black font-mono text-black">
              {totalStudyMinutes} mins
            </div>
            <div className="text-xs font-mono text-black/60">
              Total Logged Study Time
            </div>
          </div>
        </div>

        {/* Cognitive Ratio Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-black">
            <span className="flex items-center gap-1.5 text-emerald-800">
              🗣️ Active Output: {outputMinutes}m ({outputRatio}%)
            </span>
            <span className="flex items-center gap-1.5 text-indigo-900">
              📖 Passive Input: {inputMinutes}m ({inputRatio}%)
            </span>
          </div>

          <div className="w-full h-3.5 bg-black/10 rounded-full overflow-hidden flex border-2 border-black">
            <div
              style={{ width: `${outputRatio}%` }}
              className="h-full bg-[#C8E6C9] border-r-2 border-black transition-all duration-300"
              title="Active Output"
            />
            <div
              style={{ width: `${inputRatio}%` }}
              className="h-full bg-[#D1C4E9] transition-all duration-300"
              title="Passive Input"
            />
          </div>
        </div>
      </div>

      {/* 2. Low Output Alert */}
      {isLowOutputAlert && (
        <div className="p-4 rounded-2xl bg-[#FFCDD2] border-2 border-black neo-shadow-sm flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-900 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-black uppercase font-mono">
              Output Alert: Active Output is under 50%
            </h3>
            <p className="text-xs text-black/80 mt-0.5 leading-relaxed">
              Passive input without vocalization or writing slows retention. Switch to oral shadowing or launch a writing sprint now.
            </p>
          </div>
        </div>
      )}

      {/* 3. Multi-Skill Stopwatch & Detail Input */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#312E81]" />
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-black">
              Multi-Skill Quick Focus Stopwatch
            </h2>
          </div>
          <Badge variant="indigo" size="sm">
            Live Session
          </Badge>
        </div>

        {/* Skill Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { key: 'Shadowing', label: 'Shadowing', mode: 'Output', icon: <Mic className="w-4 h-4" /> },
              { key: 'Writing', label: 'Writing', mode: 'Output', icon: <PenTool className="w-4 h-4" /> },
              { key: 'Listening', label: 'Listening', mode: 'Input', icon: <Headphones className="w-4 h-4" /> },
              { key: 'Reading', label: 'Reading', mode: 'Input', icon: <BookOpen className="w-4 h-4" /> },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedSkill(item.key)}
              className={`p-3 rounded-2xl border-2 border-black flex flex-col items-center gap-1 cursor-pointer transition-all ${
                selectedSkill === item.key
                  ? 'bg-[#FFF3C4] shadow-[2px_2px_0px_0px_#000] font-bold'
                  : 'bg-black/2.5 hover:bg-black/5 font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-black">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <span className="text-[10px] font-mono text-black/60">
                Mode: {item.mode}
              </span>
            </button>
          ))}
        </div>

        {/* Universal Detail Input for ALL 4 skills */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-mono font-bold text-black flex items-center justify-between">
            <span>Session Detail / Resource Title:</span>
            <span className="text-[10px] text-black/50">Optional but recommended</span>
          </label>
          <input
            type="text"
            placeholder={getSkillPlaceholder(selectedSkill)}
            value={sessionDetailNote}
            onChange={(e) => setSessionDetailNote(e.target.value)}
            className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black font-sans font-medium"
          />
        </div>

        {/* Stopwatch Display */}
        <div className="bg-black/2.5 border border-black/10 rounded-2xl p-6 text-center space-y-4">
          <div className="text-5xl font-mono font-black text-black tracking-wider">
            {formatTime(stopwatchSeconds)}
          </div>

          <div className="flex items-center justify-center gap-2">
            {!isStopwatchRunning ? (
              <Button
                variant="mint"
                size="md"
                icon={<Play className="w-4 h-4" />}
                onClick={() => setIsStopwatchRunning(true)}
              >
                Start Session
              </Button>
            ) : (
              <Button
                variant="cream"
                size="md"
                icon={<Pause className="w-4 h-4" />}
                onClick={() => setIsStopwatchRunning(false)}
              >
                Pause Session
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              disabled={stopwatchSeconds < 3}
              onClick={handleCommitSession}
            >
              Finish & Save Session
            </Button>
          </div>
        </div>

        {/* Studio ↔ Sprints Writing Bridge Box (Shown only if Writing is selected) */}
        {selectedSkill === 'Writing' && (
          <div className="bg-[#FFF3C4]/30 border-2 border-black rounded-2xl p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-black flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-[#FF2A5F]" />
                Live Writing Pad
              </span>
              <span className="text-[10px] font-mono text-black/60">
                Will auto-archive into Sprints
              </span>
            </div>

            <textarea
              rows={4}
              placeholder="Write your paragraphs, reflections, or essay summary here..."
              value={writingBridgeText}
              onChange={(e) => setWritingBridgeText(e.target.value)}
              className="w-full bg-white border border-black/20 rounded-xl p-3 text-xs text-black focus:outline-none focus:border-black resize-y leading-relaxed"
            />

            <div className="text-xs font-mono text-black/60">
              {writingBridgeText.trim().split(/\s+/).filter(Boolean).length} words written
            </div>
          </div>
        )}
      </div>

      {/* 4. Active Session History Archive (Always Visible & Interactive) */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl p-6 neo-shadow space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#312E81]" />
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-black">
              Session History Archive ({state.timerSessions.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-black/60">Click any session for full details</span>
        </div>

        {state.timerSessions.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-black/50">
            No study sessions logged yet. Pick a skill and start the timer above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {state.timerSessions.slice(0, 15).map((sess) => (
              <div
                key={sess.id}
                onClick={() => setInspectingSession(sess)}
                className="p-3.5 bg-black/2.5 hover:bg-[#FFF3C4]/40 border-2 border-black rounded-2xl cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 space-y-2 shadow-[2px_2px_0px_0px_#000]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {sess.skill === 'Shadowing' && <Mic className="w-4 h-4 text-black" />}
                    {sess.skill === 'Writing' && <PenTool className="w-4 h-4 text-black" />}
                    {sess.skill === 'Listening' && <Headphones className="w-4 h-4 text-black" />}
                    {sess.skill === 'Reading' && <BookOpen className="w-4 h-4 text-black" />}
                    <span className="text-xs font-bold text-black font-sans">{sess.skill}</span>
                  </div>
                  <Badge variant={sess.mode === 'output' ? 'mint' : 'lavender'} size="sm">
                    {sess.mode}
                  </Badge>
                </div>

                <div className="text-xs font-mono font-black text-black">
                  {Math.max(1, Math.round(sess.durationSeconds / 60))} mins
                  <span className="text-[10px] font-normal text-black/50 ml-1">
                    ({sess.durationSeconds}s)
                  </span>
                </div>

                {sess.note ? (
                  <p className="text-[11px] text-black/80 truncate font-medium">
                    {sess.note}
                  </p>
                ) : (
                  <p className="text-[10px] text-black/40 italic">No notes logged</p>
                )}

                <div className="text-[10px] font-mono text-black/50 pt-1 border-t border-black/10">
                  {new Date(sess.timestamp).toLocaleDateString()} • {new Date(sess.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {inspectingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FFFDF5] border-2 border-black rounded-3xl neo-shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2">
                <Badge variant={inspectingSession.mode === 'output' ? 'mint' : 'lavender'}>
                  {inspectingSession.mode.toUpperCase()}
                </Badge>
                <h3 className="text-base font-bold text-black font-sans">
                  {inspectingSession.skill} Session
                </h3>
              </div>
              <button
                onClick={() => setInspectingSession(null)}
                className="p-1 rounded-lg border border-black/20 bg-white hover:bg-[#FFCDD2] cursor-pointer"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-black/2.5 rounded-xl border border-black/10 flex justify-between">
                <span className="text-black/60">Duration:</span>
                <span className="font-bold text-black">
                  {Math.round(inspectingSession.durationSeconds / 60)} minutes ({inspectingSession.durationSeconds} seconds)
                </span>
              </div>

              <div className="p-3 bg-black/2.5 rounded-xl border border-black/10 flex justify-between">
                <span className="text-black/60">Logged At:</span>
                <span className="font-bold text-black">
                  {new Date(inspectingSession.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-black/2.5 rounded-xl border border-black/10 space-y-1">
                <div className="text-black/60">Details / Resource Note:</div>
                <div className="text-black font-sans font-medium text-sm leading-relaxed">
                  {inspectingSession.note || 'No custom notes logged for this session.'}
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => setInspectingSession(null)}
            >
              Close Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};