import { useState } from 'react';
import type { SessionData } from './types/proctor';
import { getDemoSession } from './lib/analyzer';
import { StudentEditor } from './components/StudentEditor';
import { WritingReplay } from './components/WritingReplay';
import { ForensicReport } from './components/ForensicReport';
import { 
  ShieldAlert, 
  PenTool, 
  Play, 
  FileCheck2, 
  Cpu, 
  Lock,
  Sun,
  Moon
} from 'lucide-react';
import { useEffect } from 'react';

export function App() {
  const [session, setSession] = useState<SessionData>(() => getDemoSession('blatant_fraud'));
  const [activeTab, setActiveTab] = useState<'editor' | 'replay' | 'audit'>('editor');

  // Theme state: defaults to Light Mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('proctor_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('proctor_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const pasteCount = session.pasteEvents.length;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white transition-colors duration-200">
      {/* Top SaaS Header - Frosted Header */}
      <header className="bg-white/85 dark:bg-[#0d1322]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-md relative overflow-hidden group border border-slate-800">
              <ShieldAlert className="w-5 h-5 text-red-500 transition-transform group-hover:scale-110 duration-200" />
              <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-950 dark:text-white">
                  Proctor<span className="text-red-600">AI</span>
                </span>
                <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200/80 tracking-wide uppercase">
                  Integrity Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Autonomous Biometric Cadence &amp; Forensic Writing Telemetry
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/90 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-blue-600" />
              <span>Student Writing</span>
            </button>

            <button
              onClick={() => setActiveTab('replay')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'replay'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-red-600" />
              <span>Writing Replay</span>
              {pasteCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-red-600" />
              <span>Forensic Audit</span>
              {pasteCount > 0 && (
                <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[10px] rounded-full font-mono font-bold">
                  {pasteCount}
                </span>
              )}
            </button>
          </div>

          {/* Local Browser Zero-Egress Status & Dark Toggle */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-100/70 dark:bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Client-Side Biometric Engine</span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'editor' && (
          <StudentEditor
            session={session}
            onUpdateSession={setSession}
            onOpenAudit={() => setActiveTab('audit')}
            onOpenReplay={() => setActiveTab('replay')}
          />
        )}

        {activeTab === 'replay' && (
          <WritingReplay
            session={session}
            onBackToEditor={() => setActiveTab('editor')}
            onOpenAudit={() => setActiveTab('audit')}
          />
        )}

        {activeTab === 'audit' && (
          <ForensicReport
            session={session}
            onBackToEditor={() => setActiveTab('editor')}
            onOpenReplay={() => setActiveTab('replay')}
          />
        )}
      </main>

      {/* SaaS Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>
              <strong>ProctorAI</strong> — Next-Generation Academic Integrity &amp; Keystroke Cadence Biometrics Engine.
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>Deterministic Cadence Fingerprinting</span>
            <span>•</span>
            <span>Zero External API Keys</span>
            <span>•</span>
            <span className="text-red-600 font-semibold">Paste Burst &amp; Alt-Tab Defense</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
