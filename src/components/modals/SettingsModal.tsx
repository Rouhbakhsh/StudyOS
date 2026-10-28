import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Volume2,
  VolumeX,
  Volume1,
  Shield,
  Sliders,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Trash2,
  Flame,
  X,
  BookA,
  FolderOpen,
} from 'lucide-react';
import { AppState, SystemSettings } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { exportBackupJSON, parseBackupFile, getDesktopBridge } from '../../services/storage';
import { playSound } from '../../services/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onRestoreState: (restoredState: AppState) => void;
  onResetState: () => void;
  onClearAllData?: () => void;
  onResetStreaks?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateSettings,
  onRestoreState,
  onResetState,
  onClearAllData,
  onResetStreaks,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [showStreakConfirm, setShowStreakConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // محل فایل داده در نسخه دسکتاپ
  const desktop = getDesktopBridge();
  const [dataInfo, setDataInfo] = useState<{ dataFile: string; backupDir: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !desktop) return;
    desktop.getDataInfo().then(setDataInfo).catch(() => setDataInfo(null));
  }, [isOpen, desktop]);

  // Sound channels
  const isUiSoundOn = state.settings.soundEnabled;
  const uiVolume = state.settings.soundVolume ?? 0.7;

  const isLexiconSpeechOn = (state.settings as any).lexiconSpeechEnabled ?? true;
  const lexiconVolume = (state.settings as any).lexiconVolume ?? 0.8;

  const handleExport = () => {
    exportBackupJSON(state);
    playSound('complete', state.settings.soundEnabled);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const parsed = await parseBackupFile(file);
      onRestoreState(parsed);
      setImportSuccess('Database snapshot restored and verified successfully!');
      playSound('complete', state.settings.soundEnabled);
      setTimeout(() => setImportSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON snapshot';
      setImportError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Configuration & Safeguards"
      subtitle="Offline vault persistence, dual audio channels, and data safeguards."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* 1. JSON Vault Backup & Restore */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 space-y-3 neo-shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <span className="text-xs font-mono font-black text-black uppercase tracking-wider flex items-center gap-1.5">
              <FileJson className="w-4 h-4 text-[#312E81]" />
              JSON Vault Backup & Restore
            </span>
            <Badge variant="mint" size="sm">
              Offline-First
            </Badge>
          </div>

          {desktop ? (
            <div className="space-y-2">
              <p className="text-xs text-black/70 leading-relaxed">
                All progress is saved automatically to a file on this computer. Clearing browser data has no effect on it. A daily backup is kept (last 30 days).
              </p>
              {dataInfo && (
                <div className="text-[11px] font-mono text-black/70 bg-white border border-black/15 rounded-xl p-2.5 space-y-1 break-all">
                  <div>
                    <span className="font-bold text-black">Data file:</span> {dataInfo.dataFile}
                  </div>
                  <div>
                    <span className="font-bold text-black">Backups:</span> {dataInfo.backupDir}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-black/70 leading-relaxed">
              All curriculum progress, cloze flashcards, error logs, and sprint sessions reside in your local browser vault. Export encrypted JSON snapshots periodically.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="mint"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExport}
            >
              Export JSON Vault
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Import Backup Snapshot
            </Button>
            {desktop && (
              <Button
                variant="secondary"
                size="sm"
                icon={<FolderOpen className="w-3.5 h-3.5" />}
                onClick={() => desktop.openDataFolder()}
              >
                Open Data Folder
              </Button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>

          {importSuccess && (
            <div className="text-xs font-mono text-emerald-950 bg-[#C8E6C9] p-2.5 rounded-xl border-2 border-black flex items-center gap-2 animate-in fade-in shadow-[2px_2px_0px_0px_#000]">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {importError && (
            <div className="text-xs font-mono text-rose-950 bg-[#FFCDD2] p-2.5 rounded-xl border-2 border-black flex items-center gap-2 animate-in fade-in shadow-[2px_2px_0px_0px_#000]">
              <AlertTriangle className="w-4 h-4 text-rose-800 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
        </div>

        {/* 2. Dual Audio Channels: Sound Effects & Lexicon Speech */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 space-y-4 neo-shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <span className="text-xs font-mono font-black text-black uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#312E81]" />
              Dual Audio Channels & Sound Engine
            </span>
            <Badge variant="lavender" size="sm">
              Independent Channels
            </Badge>
          </div>

          {/* Channel A: System Sound Effects */}
          <div className="space-y-2 pb-3 border-b border-black/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-black flex items-center gap-1.5">
                  {isUiSoundOn ? (
                    <Volume2 className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-black/40" />
                  )}
                  <span>UI & System Sound Effects</span>
                </div>
                <p className="text-[11px] text-black/60">
                  Synthesized tones for mission clears, ratings, flips, and button feedback.
                </p>
              </div>

              <Button
                variant={isUiSoundOn ? 'mint' : 'primary'}
                size="sm"
                onClick={() => {
                  const next = !isUiSoundOn;
                  onUpdateSettings({ soundEnabled: next });
                  if (next) playSound('complete', true);
                }}
              >
                {isUiSoundOn ? 'Active (ON)' : 'Muted (OFF)'}
              </Button>
            </div>

            <div
              className={`space-y-1 transition-opacity duration-200 ${
                isUiSoundOn ? 'opacity-100' : 'opacity-35 pointer-events-none'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-black/70 font-semibold flex items-center gap-1">
                  <Volume1 className="w-3.5 h-3.5" />
                  SFX Volume
                </span>
                <span className="bg-[#FFF3C4] border border-black/20 px-2 py-0.5 rounded text-black font-bold">
                  {Math.round(uiVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                disabled={!isUiSoundOn}
                value={uiVolume}
                onChange={(e) => onUpdateSettings({ soundVolume: Number(e.target.value) })}
                className="w-full accent-[#312E81] cursor-pointer"
              />
            </div>
          </div>

          {/* Channel B: Lexicon Pronunciation */}
          <div className="space-y-2 pb-3 border-b border-black/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-black flex items-center gap-1.5">
                  {isLexiconSpeechOn ? (
                    <Volume2 className="w-4 h-4 text-indigo-700" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-black/40" />
                  )}
                  <span>Lexicon Voice Pronunciation</span>
                </div>
                <p className="text-[11px] text-black/60">
                  Natural text-to-speech pronunciation tracks inside the Lexicon and flashcards.
                </p>
              </div>

              <Button
                variant={isLexiconSpeechOn ? 'mint' : 'primary'}
                size="sm"
                onClick={() => {
                  onUpdateSettings({ lexiconSpeechEnabled: !isLexiconSpeechOn } as any);
                }}
              >
                {isLexiconSpeechOn ? 'Active (ON)' : 'Muted (OFF)'}
              </Button>
            </div>

            <div
              className={`space-y-1 transition-opacity duration-200 ${
                isLexiconSpeechOn ? 'opacity-100' : 'opacity-35 pointer-events-none'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-black/70 font-semibold flex items-center gap-1">
                  <BookA className="w-3.5 h-3.5" />
                  Speech Volume
                </span>
                <span className="bg-[#FFF3C4] border border-black/20 px-2 py-0.5 rounded text-black font-bold">
                  {Math.round(lexiconVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                disabled={!isLexiconSpeechOn}
                value={lexiconVolume}
                onChange={(e) => onUpdateSettings({ lexiconVolume: Number(e.target.value) } as any)}
                className="w-full accent-[#312E81] cursor-pointer"
              />
            </div>
          </div>

          {/* 25-Minute Vocal Rest Guard */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-xs font-bold text-black flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>25-Minute Vocal Cord Guard</span>
              </div>
              <p className="text-[11px] text-black/60">
                Prompts hydration and articulatory rest pauses after 25m continuous vocal shadowing.
              </p>
            </div>

            <Button
              variant={state.settings.vocalRestGuard ? 'cream' : 'primary'}
              size="sm"
              onClick={() => onUpdateSettings({ vocalRestGuard: !state.settings.vocalRestGuard })}
            >
              {state.settings.vocalRestGuard ? 'Active' : 'Disabled'}
            </Button>
          </div>

          {/* Daily Review Cap */}
          <div className="space-y-2 pt-3 border-t border-black/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-black flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#312E81]" />
                  <span>Daily Flashcard Review Cap</span>
                </div>
                <p className="text-[11px] text-black/60">
                  Prevents review backlog spikes from creating cognitive overload.
                </p>
              </div>

              <span className="font-mono text-xs font-black text-black bg-[#FFF3C4] px-2.5 py-1 rounded-lg border border-black/20">
                {state.settings.dailyReviewCap} Cards / Day
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[10px] text-black/50">
              <span>10</span>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={state.settings.dailyReviewCap}
                onChange={(e) => onUpdateSettings({ dailyReviewCap: Number(e.target.value) })}
                className="w-full accent-[#312E81] cursor-pointer"
              />
              <span>60</span>
            </div>
          </div>
        </div>

        {/* 3. Reset Today's Active Day Progress */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 neo-shadow-sm">
          <div>
            <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-600" />
              <span>Reset Active Day Progress</span>
            </div>
            <p className="text-[11px] text-black/60 mt-0.5">
              Clears today's completion checks, timers, and rituals without modifying lexicon or cards.
            </p>
          </div>

          {!showStreakConfirm ? (
            <Button
              variant="cream"
              size="sm"
              onClick={() => setShowStreakConfirm(true)}
            >
              Reset Today
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-[#FFF3C4] border-2 border-black rounded-xl animate-in zoom-in-95 shadow-[2px_2px_0px_0px_#000]">
              <span className="text-xs font-mono font-bold text-amber-950">Reset today's checks?</span>
              <button
                type="button"
                onClick={() => {
                  if (onResetStreaks) onResetStreaks();
                  setShowStreakConfirm(false);
                }}
                className="px-2.5 py-1 text-xs font-mono font-bold bg-[#FF2A5F] text-white rounded-lg border border-black hover:bg-rose-700 cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowStreakConfirm(false)}
                className="p-1 hover:bg-black/10 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-black/70" />
              </button>
            </div>
          )}
        </div>

        {/* 4. Restore Demo Seed State */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 neo-shadow-sm">
          <div>
            <div className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-[#FF2A5F]" />
              <span>Restore Demo Seed State</span>
            </div>
            <p className="text-[11px] text-black/60 mt-0.5">
              Re-initializes StudyOS back to Day 1 with default curriculum seed data.
            </p>
          </div>

          {!showResetConfirm ? (
            <Button
              variant="rose"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
            >
              Restore Initial Demo
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-[#FFCDD2] border-2 border-black rounded-xl animate-in zoom-in-95 shadow-[2px_2px_0px_0px_#000]">
              <span className="text-xs font-mono font-bold text-rose-950">Reset to Day 1?</span>
              <button
                type="button"
                onClick={() => {
                  onResetState();
                  setShowResetConfirm(false);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs font-mono font-bold bg-black text-white rounded-lg border border-black hover:bg-neutral-800 cursor-pointer"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="p-1 hover:bg-black/10 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-black/70" />
              </button>
            </div>
          )}
        </div>

        {/* 5. Hard Purge (Zero Items) */}
        <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 neo-shadow-sm">
          <div>
            <div className="text-xs font-bold text-red-950 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Hard Purge (Zero Items Clean Slate)</span>
            </div>
            <p className="text-[11px] text-black/60 mt-0.5">
              Permanently purges all vocabulary items, flashcards, mistake logs, and timers.
            </p>
          </div>

          {!showWipeConfirm ? (
            <Button
              variant="coral"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setShowWipeConfirm(true)}
            >
              Wipe Everything
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-[#FFCDD2] border-2 border-black rounded-xl animate-in zoom-in-95 shadow-[2px_2px_0px_0px_#000]">
              <span className="text-xs font-mono font-bold text-red-950">Purge 100% of data?</span>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllData) onClearAllData();
                  setShowWipeConfirm(false);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs font-mono font-bold bg-red-600 text-white rounded-lg border border-black hover:bg-red-700 cursor-pointer"
              >
                Purge All
              </button>
              <button
                type="button"
                onClick={() => setShowWipeConfirm(false)}
                className="p-1 hover:bg-black/10 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-black/70" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-black/10 flex justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>
            Done & Close Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;