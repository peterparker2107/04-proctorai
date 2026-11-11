import { useState, useEffect, useRef } from 'react';
import type { 
  DocumentEvent, 
  PasteBurstEvent, 
  TabSwitchEvent, 
  SessionData 
} from '../types/proctor';
import { getDemoSession } from '../lib/analyzer';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Play, 
  FileText, 
  Sparkles, 
  RotateCcw, 
  Zap, 
  Eye, 
  Clock, 
  CheckCircle2,
  Copy
} from 'lucide-react';

interface StudentEditorProps {
  session: SessionData;
  onUpdateSession: (newSession: SessionData) => void;
  onOpenAudit: () => void;
  onOpenReplay: () => void;
}

export const StudentEditor: React.FC<StudentEditorProps> = ({
  session,
  onUpdateSession,
  onOpenAudit,
  onOpenReplay,
}) => {
  const [text, setText] = useState<string>(session.finalText || '');
  const [cpm, setCpm] = useState<number>(0);
  const [wpm, setWpm] = useState<number>(0);
  const [lastBurstAlert, setLastBurstAlert] = useState<{
    length: number;
    time: string;
    snippet: string;
  } | null>(null);
  const [tabWarning, setTabWarning] = useState<string | null>(null);

  const lastKeyTimeRef = useRef<number>(Date.now());
  const blurStartTimeRef = useRef<number | null>(null);
  const recentKeystrokeTimes = useRef<number[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal text state if external session changed
  useEffect(() => {
    setText(session.finalText || '');
  }, [session.finalText]);

  // Tab switch / visibility tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        blurStartTimeRef.current = now;
        const blurEvent: TabSwitchEvent = {
          id: `ts-blur-${now}`,
          timestamp: now,
          relativeTime: now - session.startTime,
          type: 'BLUR',
        };
        const docBlurEvent: DocumentEvent = {
          id: `ev-blur-${now}`,
          timestamp: now,
          relativeTime: now - session.startTime,
          type: 'tab_blur',
          addedLength: 0,
          deletedLength: 0,
          contentSnippet: '[Tab Switched Out / Application Blur]',
          textSnapshotLength: text.length,
          isBurst: false,
        };

        onUpdateSession({
          ...session,
          tabSwitches: [...session.tabSwitches, blurEvent],
          events: [...session.events, docBlurEvent],
        });

        setTabWarning('Focus lost: External tab switch recorded in forensic log');
      } else {
        const awayDuration = blurStartTimeRef.current ? (now - blurStartTimeRef.current) : 0;
        blurStartTimeRef.current = null;

        const focusEvent: TabSwitchEvent = {
          id: `ts-focus-${now}`,
          timestamp: now,
          relativeTime: now - session.startTime,
          type: 'FOCUS',
          awayDurationMs: awayDuration,
        };

        const docFocusEvent: DocumentEvent = {
          id: `ev-focus-${now}`,
          timestamp: now,
          relativeTime: now - session.startTime,
          type: 'tab_focus',
          addedLength: 0,
          deletedLength: 0,
          contentSnippet: `[Tab Refocused: away ${(awayDuration / 1000).toFixed(1)}s]`,
          textSnapshotLength: text.length,
          isBurst: false,
        };

        onUpdateSession({
          ...session,
          tabSwitches: [...session.tabSwitches, focusEvent],
          events: [...session.events, docFocusEvent],
        });

        setTimeout(() => {
          setTabWarning(null);
        }, 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, text, onUpdateSession]);

  // Handle typing velocity calculation
  const updateVelocity = () => {
    const now = Date.now();
    recentKeystrokeTimes.current.push(now);
    // Keep only timestamps within last 5 seconds
    recentKeystrokeTimes.current = recentKeystrokeTimes.current.filter(t => now - t <= 5000);

    const count = recentKeystrokeTimes.current.length;
    const computedCPM = Math.round((count / 5) * 60);
    const computedWPM = Math.round(computedCPM / 5);
    setCpm(computedCPM);
    setWpm(computedWPM);
  };

  // Keystroke handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore pure modifier presses
    if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;

    const now = Date.now();
    const latency = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;
    updateVelocity();

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const docEvent: DocumentEvent = {
        id: `ev-bs-${now}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
        relativeTime: now - session.startTime,
        type: e.key === 'Backspace' ? 'backspace' : 'delete',
        key: e.key,
        addedLength: 0,
        deletedLength: 1,
        contentSnippet: e.key,
        textSnapshotLength: Math.max(0, text.length - 1),
        interKeyLatency: latency,
        isBurst: false,
      };

      onUpdateSession({
        ...session,
        events: [...session.events, docEvent],
      });
    }
  };

  // Text change handler (catches single character additions)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const now = Date.now();
    const diff = newText.length - text.length;

    setText(newText);

    // If single typed char (paste handled separately by onPaste)
    if (diff === 1) {
      const addedChar = newText.slice(-1);
      const latency = now - lastKeyTimeRef.current;

      const docEvent: DocumentEvent = {
        id: `ev-type-${now}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
        relativeTime: now - session.startTime,
        type: 'type',
        key: addedChar,
        addedLength: 1,
        deletedLength: 0,
        contentSnippet: addedChar,
        textSnapshotLength: newText.length,
        interKeyLatency: latency,
        instantVelocityCPM: latency > 0 ? Math.min(2500, Math.round(60000 / latency)) : 300,
        isBurst: false,
      };

      onUpdateSession({
        ...session,
        finalText: newText,
        totalDurationMs: now - session.startTime,
        events: [...session.events, docEvent],
      });
    } else {
      // General text update
      onUpdateSession({
        ...session,
        finalText: newText,
        totalDurationMs: now - session.startTime,
      });
    }
  };

  // Clipboard Paste Detection (Burst Detector)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedData = e.clipboardData.getData('text');
    if (!pastedData) return;

    const now = Date.now();
    const length = pastedData.length;
    const isBurst = length >= 20; // 20+ chars appearing in 1ms is definitely a paste event

    // Record Paste Burst Event
    const burstEvent: PasteBurstEvent = {
      id: `burst-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      relativeTime: now - session.startTime,
      length,
      snippet: pastedData.slice(0, 120),
      timeDeltaMs: 1, // clipboard insertion happens in single execution tick
      estimatedCPM: Math.round((length / 0.005) * 60), // astronomical rate
      severity: length > 300 ? 'CRITICAL' : length > 80 ? 'HIGH' : 'MEDIUM',
    };

    const docEvent: DocumentEvent = {
      id: `ev-paste-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      relativeTime: now - session.startTime,
      type: 'paste',
      addedLength: length,
      deletedLength: 0,
      contentSnippet: pastedData,
      textSnapshotLength: text.length + length,
      interKeyLatency: 1,
      instantVelocityCPM: burstEvent.estimatedCPM,
      isBurst,
    };

    setLastBurstAlert({
      length,
      time: new Date(now).toLocaleTimeString(),
      snippet: pastedData.slice(0, 60),
    });

    onUpdateSession({
      ...session,
      pasteEvents: [...session.pasteEvents, burstEvent],
      events: [...session.events, docEvent],
    });

    // Dismiss alert after 6 seconds
    setTimeout(() => {
      setLastBurstAlert(null);
    }, 6000);
  };

  // Simulate Instant AI Paste Dump
  const triggerSimulatedAIPaste = () => {
    const aiText = `\n\n[PASTED CHUNK]: Byzantine Fault Tolerance (BFT) protocols address the arbitrary node failure problem across distributed networks. In a network with 3f+1 nodes, the system can tolerate up to f Byzantine (malicious or arbitrary) failures without compromising consensus validity or safety. Practical Byzantine Fault Tolerance (PBFT) optimizes this via three distinct phases: Pre-Prepare, Prepare, and Commit, ensuring all non-faulty replicas agree on an identical state transition order despite adversarial delays.`;
    
    const now = Date.now();
    const newText = text + aiText;
    setText(newText);

    const burstEvent: PasteBurstEvent = {
      id: `sim-burst-${now}`,
      timestamp: now,
      relativeTime: now - session.startTime,
      length: aiText.length,
      snippet: aiText.slice(0, 100),
      timeDeltaMs: 2,
      estimatedCPM: 8400000,
      severity: 'CRITICAL',
    };

    const docEvent: DocumentEvent = {
      id: `ev-sim-paste-${now}`,
      timestamp: now,
      relativeTime: now - session.startTime,
      type: 'paste',
      addedLength: aiText.length,
      deletedLength: 0,
      contentSnippet: aiText,
      textSnapshotLength: newText.length,
      interKeyLatency: 2,
      instantVelocityCPM: 8400000,
      isBurst: true,
    };

    setLastBurstAlert({
      length: aiText.length,
      time: new Date(now).toLocaleTimeString(),
      snippet: aiText.slice(0, 60),
    });

    onUpdateSession({
      ...session,
      finalText: newText,
      pasteEvents: [...session.pasteEvents, burstEvent],
      events: [...session.events, docEvent],
    });

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Preset Scenario Loaders
  const loadScenario = (type: 'legitimate' | 'blatant_fraud' | 'telegram_patchwork') => {
    const demo = getDemoSession(type);
    onUpdateSession(demo);
    setText(demo.finalText);
    setCpm(type === 'legitimate' ? 240 : 18000);
    setWpm(type === 'legitimate' ? 48 : 3600);
  };

  const clearEditor = () => {
    const now = Date.now();
    setText('');
    setCpm(0);
    setWpm(0);
    setLastBurstAlert(null);
    onUpdateSession({
      sessionId: `TIET-${Date.now().toString().slice(-6)}`,
      studentName: 'Candidate ' + Math.floor(1000 + Math.random() * 9000),
      studentRollNo: '1022' + Math.floor(10000 + Math.random() * 90000),
      courseCode: 'UCS505 (Distributed Systems)',
      assignmentTitle: 'Assignment Submission & Assessment',
      startTime: now,
      totalDurationMs: 0,
      finalText: '',
      events: [],
      tabSwitches: [],
      pasteEvents: [],
    });
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const pasteCount = session.pasteEvents.length;
  const tabSwitchCount = session.tabSwitches.filter(t => t.type === 'BLUR').length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner: Academic Integrity & Context */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
              PROCTOR KERNEL ACTIVE
            </span>
            <span className="text-xs text-slate-500 font-mono">
              SESSION: {session.sessionId}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            {session.assignmentTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Student: <span className="font-semibold text-slate-800">{session.studentName}</span> ({session.studentRollNo}) • Course: <span className="font-mono text-slate-700">{session.courseCode}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenReplay}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-600" />
            Replay Writing
          </button>

          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            Audit Submission ({pasteCount > 0 ? `${pasteCount} Pastes Flagged` : 'Run Forensic'})
          </button>
        </div>
      </div>

      {/* Scenario Selector Presets */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-slate-800">Validation Presets:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadScenario('legitimate')}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 font-semibold transition-colors cursor-pointer"
          >
            🟢 Legitimate Student (Organic)
          </button>
          <button
            onClick={() => loadScenario('blatant_fraud')}
            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100/80 text-red-800 border border-red-200 font-bold transition-colors cursor-pointer"
          >
            🔴 Instant ChatGPT Dump (1.2k chars in 2ms)
          </button>
          <button
            onClick={() => loadScenario('telegram_patchwork')}
            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200 font-semibold transition-colors cursor-pointer"
          >
            🟠 External Group Leak (Patchwork)
          </button>
          <button
            onClick={clearEditor}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors cursor-pointer"
            title="Reset to blank scratchpad"
          >
            <RotateCcw className="w-3 h-3 inline mr-1" />
            Clear
          </button>
        </div>
      </div>

      {/* Active Alerts Banner if paste burst or tab switch detected */}
      {tabWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-medium">{tabWarning}</span>
          </div>
          <span className="font-mono text-[11px] bg-amber-100 px-2 py-0.5 rounded text-amber-800">
            Window Blur Event
          </span>
        </div>
      )}

      {lastBurstAlert && (
        <div className="bg-red-50 border-l-4 border-red-600 p-3.5 rounded-r-lg flex items-start justify-between text-xs text-red-950 animate-forensic-glow">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-900 flex items-center gap-1.5">
                INSTANT CLIPBOARD BURST DETECTED (+{lastBurstAlert.length} characters in &lt;1ms)
              </p>
              <p className="text-[11px] text-red-700 font-mono mt-0.5">
                "{lastBurstAlert.snippet}..."
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] bg-red-200 text-red-900 px-2 py-0.5 rounded font-bold">
            FLAGGED IN AUDIT TRAIL
          </span>
        </div>
      )}

      {/* Editor & Live Telemetry Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Textarea */}
        <div className="lg:col-span-3 flex flex-col bg-white border border-slate-300 rounded-xl shadow-forensic overflow-hidden">
          {/* Subheader */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>LIVE KEYSTROKE CADENCE LOGGER</span>
            </div>
            <div className="flex items-center gap-4">
              <span title="Total events captured in memory">
                Events Captured: <strong className="text-slate-900">{session.events.length}</strong>
              </span>
              <button
                onClick={triggerSimulatedAIPaste}
                className="flex items-center gap-1 text-[11px] bg-red-100 hover:bg-red-200 text-red-800 px-2 py-0.5 rounded border border-red-300 font-sans font-medium transition-colors"
                title="Inject instant 450-char chunk to test burst detector"
              >
                <Zap className="w-3 h-3 text-red-600" />
                Simulate Cheat Paste
              </button>
            </div>
          </div>

          {/* Actual Editable Area */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Start typing your exam answer or assignment response here... ProctorAI monitors your keystroke intervals, inter-key cadence, and clipboard dumps in real-time."
            rows={15}
            className="w-full p-5 text-sm font-mono leading-relaxed text-slate-800 bg-clinical-paper focus:outline-none resize-y min-h-[360px]"
          />

          {/* Bottom Editor Telemetry Bar */}
          <div className="bg-slate-100 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-600 font-mono">
            <div className="flex items-center gap-5">
              <span>Chars: <strong className="text-slate-900">{text.length}</strong></span>
              <span>Words: <strong className="text-slate-900">{wordCount}</strong></span>
              <span>
                Speed: <strong className={cpm > 1500 ? 'text-red-600 font-bold' : 'text-slate-900'}>{cpm} CPM</strong> ({wpm} WPM)
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Session: {Math.round(session.totalDurationMs / 1000)}s
              </span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cadence Active
              </span>
            </div>
          </div>
        </div>

        {/* Side Forensic Telemetry Panel */}
        <div className="space-y-4">
          {/* Quick Forensic Gauge Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-forensic">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Audit Signals
              </span>
              <span className="text-[10px] font-mono text-slate-400">REAL-TIME</span>
            </div>

            <div className="space-y-3">
              {/* Paste Bursts */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-red-500" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Paste Events</div>
                    <div className="text-[10px] text-slate-500">Clipboard dumps</div>
                  </div>
                </div>
                <div className={`text-base font-bold font-mono ${pasteCount > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                  {pasteCount}
                </div>
              </div>

              {/* Tab Switches */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Tab Switches</div>
                    <div className="text-[10px] text-slate-500">Focus lost count</div>
                  </div>
                </div>
                <div className={`text-base font-bold font-mono ${tabSwitchCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {tabSwitchCount}
                </div>
              </div>

              {/* Instant CPM */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Typing Cadence</div>
                    <div className="text-[10px] text-slate-500">Human: 150-400 CPM</div>
                  </div>
                </div>
                <div className={`text-sm font-bold font-mono ${cpm > 1000 ? 'text-red-600' : 'text-slate-700'}`}>
                  {cpm} CPM
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAudit}
              className="w-full mt-4 py-2 px-3 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Forensic Report
            </button>
          </div>

          {/* Institutional Integrity & Exam Security Policy */}
          <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3.5 text-xs text-red-950 shadow-xs">
            <h4 className="font-bold text-red-900 mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              Automated Integrity Defense
            </h4>
            <p className="text-[11px] leading-relaxed text-red-800">
              Continuously defends against external collusion channels during Online Assessments and catches instantaneous LLM copy-paste injection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
