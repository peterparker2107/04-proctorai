import { useState, useEffect, useRef, useMemo } from 'react';
import type { SessionData, DocumentEvent } from '../types/proctor';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  AlertTriangle, 
  FileText, 
  Activity, 
  ArrowLeft,
  SkipForward,
  CheckCircle2
} from 'lucide-react';

interface WritingReplayProps {
  session: SessionData;
  onBackToEditor: () => void;
  onOpenAudit: () => void;
}

export const WritingReplay: React.FC<WritingReplayProps> = ({
  session,
  onBackToEditor,
  onOpenAudit,
}) => {
  const events = session.events || [];
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(5); // default 5x for great viewing experience
  const [burstAlert, setBurstAlert] = useState<{
    length: number;
    snippet: string;
    timestamp: number;
  } | null>(null);

  const timerRef = useRef<number | null>(null);

  // Compute text reconstructed up to currentIndex
  const reconstructedText = useMemo(() => {
    let text = '';
    const slice = events.slice(0, currentIndex + 1);
    for (const ev of slice) {
      if (ev.type === 'paste') {
        text += ev.contentSnippet;
      } else if (ev.type === 'type') {
        text += ev.contentSnippet;
      } else if (ev.type === 'backspace' || ev.type === 'delete') {
        text = text.slice(0, Math.max(0, text.length - (ev.deletedLength || 1)));
      }
    }
    return text;
  }, [events, currentIndex]);

  const currentEvent: DocumentEvent | undefined = events[currentIndex];

  // Stop playback if reached end
  useEffect(() => {
    if (currentIndex >= events.length - 1) {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [currentIndex, events.length]);

  // Tick engine
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Determine interval based on playback speed
    // 1x = ~80ms per tick, 2x = ~40ms, 5x = ~16ms, 10x = ~8ms
    const intervalMs = Math.max(8, Math.round(75 / speed));

    timerRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= events.length - 1) {
          setIsPlaying(false);
          return prev;
        }

        const nextIdx = prev + 1;
        const ev = events[nextIdx];

        if (ev && ev.type === 'paste') {
          // Trigger visual flash
          setBurstAlert({
            length: ev.addedLength,
            snippet: ev.contentSnippet.slice(0, 80),
            timestamp: ev.timestamp,
          });
          // Auto clear burst visual after brief flash
          setTimeout(() => setBurstAlert(null), 1800);
        }

        return nextIdx;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, events]);

  const togglePlay = () => {
    if (currentIndex >= events.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setBurstAlert(null);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIdx = parseInt(e.target.value, 10);
    setCurrentIndex(newIdx);
    const ev = events[newIdx];
    if (ev && ev.type === 'paste') {
      setBurstAlert({
        length: ev.addedLength,
        snippet: ev.contentSnippet.slice(0, 80),
        timestamp: ev.timestamp,
      });
    } else {
      setBurstAlert(null);
    }
  };

  // Jump to next paste burst
  const jumpToNextBurst = () => {
    const nextBurstIdx = events.findIndex((ev, idx) => idx > currentIndex && ev.type === 'paste');
    if (nextBurstIdx !== -1) {
      setCurrentIndex(nextBurstIdx);
      const ev = events[nextBurstIdx];
      setBurstAlert({
        length: ev.addedLength,
        snippet: ev.contentSnippet.slice(0, 80),
        timestamp: ev.timestamp,
      });
    }
  };

  const progressPercent = events.length > 0 ? Math.round((currentIndex / (events.length - 1)) * 100) : 0;
  const currentRelTimeSec = currentEvent ? (currentEvent.relativeTime / 1000).toFixed(1) : '0.0';

  // Mark all paste event positions along the timeline for the scrubber
  const pasteMarkers = useMemo(() => {
    if (events.length === 0) return [];
    return events
      .map((ev, idx) => ({ ev, idx }))
      .filter(({ ev }) => ev.type === 'paste')
      .map(({ idx, ev }) => ({
        idx,
        percent: (idx / (events.length - 1)) * 100,
        length: ev.addedLength,
      }));
  }, [events]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-forensic">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Back to Editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase text-slate-500 font-mono">
                CADENCE REPLAY KERNEL
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                {events.length} Recorded Steps
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Forensic Playback: {session.studentName}
            </h2>
          </div>
        </div>

        <button
          onClick={onOpenAudit}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          View Forensic Audit
        </button>
      </div>

      {/* Main Replay Stage & Screen */}
      <div className="relative bg-white border border-slate-300 rounded-xl shadow-forensic overflow-hidden">
        {/* Playback Status Bar */}
        <div className="bg-slate-900 text-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
              {isPlaying ? 'PLAYING BACK' : 'PAUSED'}
            </span>
            <span className="text-slate-400">•</span>
            <span>T+{currentRelTimeSec}s</span>
            <span className="text-slate-400">•</span>
            <span>Step {currentIndex + 1} / {events.length}</span>
          </div>

          <div className="flex items-center gap-4">
            {currentEvent && (
              <span className="text-slate-300">
                Action: <strong className={currentEvent.isBurst ? 'text-red-400' : 'text-slate-100'}>{currentEvent.type.toUpperCase()}</strong>
                {currentEvent.interKeyLatency ? ` (${currentEvent.interKeyLatency}ms latency)` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Burst Alert Overlay (Flashes bright red when paste event occurs) */}
        {burstAlert && (
          <div className="absolute top-12 left-6 right-6 z-20 bg-red-600 text-white p-4 rounded-xl shadow-2xl border-2 border-red-300 animate-bounce">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-300 flex-shrink-0 animate-spin" />
                <div>
                  <h4 className="font-extrabold text-sm tracking-wide">
                    ⚠️ CRITICAL CLIPBOARD BURST DETECTED (+{burstAlert.length} CHARACTERS)
                  </h4>
                  <p className="text-xs text-red-100 font-mono mt-0.5 line-clamp-1">
                    Instant injection: "{burstAlert.snippet}"
                  </p>
                </div>
              </div>
              <div className="bg-black/40 px-3 py-1 rounded text-xs font-mono font-bold">
                1ms Influx
              </div>
            </div>
          </div>
        )}

        {/* Text Document Viewer (Simulates student typing live) */}
        <div className="p-6 min-h-[320px] max-h-[460px] overflow-y-auto font-mono text-sm leading-relaxed text-slate-800 bg-clinical-paper">
          {reconstructedText ? (
            <div className="whitespace-pre-wrap break-words">
              {reconstructedText}
              <span className="inline-block w-2 h-4 ml-0.5 bg-red-600 animate-pulse align-middle" />
            </div>
          ) : (
            <div className="text-slate-400 italic flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Document playback starts at step 1. Press play or scrub the timeline below.
            </div>
          )}
        </div>

        {/* Timeline Scrubber & Marker Bar */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3">
          {/* Progress Slider with Paste Indicators */}
          <div className="relative pt-2 pb-1">
            {/* Red pins for paste events along track */}
            <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
              {pasteMarkers.map((marker, i) => (
                <div
                  key={i}
                  style={{ left: `${marker.percent}%` }}
                  title={`Paste Burst: ${marker.length} characters`}
                  className="absolute -top-1 -ml-1 w-2.5 h-3.5 bg-red-600 border border-white rounded-sm shadow-sm z-10 cursor-pointer"
                />
              ))}
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(0, events.length - 1)}
              value={currentIndex}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none"
            />
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {/* Play/Pause/Reset/Jump */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  isPlaying 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play Replay'}
              </button>

              <button
                onClick={handleReset}
                className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                title="Reset to beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {pasteMarkers.length > 0 && (
                <button
                  onClick={jumpToNextBurst}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium border border-red-300 transition-colors"
                  title="Jump directly to next flagged paste burst"
                >
                  <SkipForward className="w-3.5 h-3.5 text-red-600" />
                  Next Burst
                </button>
              )}
            </div>

            {/* Playback Speed Selector (1x, 2x, 5x, 10x) */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-mono">
              <span className="text-[11px] text-slate-500 px-1.5 flex items-center gap-1">
                <FastForward className="w-3 h-3" />
                Speed:
              </span>
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    speed === s 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Replay Telemetry */}
            <div className="text-xs font-mono text-slate-500">
              Progress: <strong className="text-slate-900">{progressPercent}%</strong>
              {pasteMarkers.length > 0 && (
                <span className="ml-3 text-red-600 font-semibold">
                  🔴 {pasteMarkers.length} Bursts Flagged
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Insight Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>
            <strong>Deterministic Replay:</strong> Every keystroke, delay, backspace, and paste event is cryptographically preserved and replayable step-by-step for academic appeals.
          </span>
        </div>
        <span className="font-mono text-slate-400 text-[11px]">RFC-BIOMETRIC-CADENCE-v2</span>
      </div>
    </div>
  );
};
