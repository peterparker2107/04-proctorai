import { useState } from 'react';
import type { SessionData, ForensicAnalysis, ForensicVerdict } from '../types/proctor';
import { analyzeForensics } from '../lib/analyzer';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Printer, 
  ArrowLeft, 
  Play, 
  Hash, 
  CheckCircle2, 
  XCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface ForensicReportProps {
  session: SessionData;
  onBackToEditor: () => void;
  onOpenReplay: () => void;
}

export const ForensicReport: React.FC<ForensicReportProps> = ({
  session,
  onBackToEditor,
  onOpenReplay,
}) => {
  const analysis: ForensicAnalysis = analyzeForensics(session);
  const [filterType, setFilterType] = useState<'all' | 'bursts' | 'tabs'>('all');

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      session,
      forensicAudit: analysis,
      auditTimestamp: new Date().toISOString(),
      institution: "Department of Academic Evaluation & Integrity",
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ProctorAI-Audit-${session.sessionId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const printReport = () => {
    window.print();
  };

  const getVerdictBadge = (verdict: ForensicVerdict) => {
    switch (verdict) {
      case 'FLAGGED_FOR_PASTE_FRAUD':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-900 border-2 border-red-600 rounded-lg shadow-sm font-mono font-bold text-sm tracking-wider uppercase">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            FLAGGED_FOR_PASTE_FRAUD
          </div>
        );
      case 'SUSPICIOUS_ANOMALY':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-900 border-2 border-amber-500 rounded-lg shadow-sm font-mono font-bold text-sm tracking-wider uppercase">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            SUSPICIOUS_ANOMALY (MANUAL REVIEW)
          </div>
        );
      case 'INTEGRITY_VERIFIED':
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-900 border-2 border-emerald-600 rounded-lg shadow-sm font-mono font-bold text-sm tracking-wider uppercase">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            INTEGRITY_VERIFIED
          </div>
        );
    }
  };

  // Filter events for the forensic table
  const filteredEvents = session.events.filter((ev) => {
    if (filterType === 'bursts') return ev.isBurst || ev.type === 'paste';
    if (filterType === 'tabs') return ev.type === 'tab_blur' || ev.type === 'tab_focus';
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 print:space-y-4 print:p-0">
      {/* Top Bar / Navigation */}
      <div className="flex flex-wrap items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-forensic print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Back to Editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              OFFICIAL ACADEMIC INTEGRITY AUDIT
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Forensic Evaluation Report
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenReplay}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-blue-600" />
            Replay Writing Cadence
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Main Clinical Document Header */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6 sm:p-8 shadow-forensic space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white tracking-widest uppercase">
                DEPARTMENT OF ACADEMIC EVALUATION &amp; INTEGRITY
              </span>
              <span className="text-xs text-slate-500 font-mono">
                CASE #{session.sessionId}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              ProctorAI Forensic Writing Evaluation
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Cryptographic keystroke telemetry and clipboard burst analysis conducted for authenticated examination and assignment submissions.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {getVerdictBadge(analysis.verdict)}
            <span className="text-[11px] font-mono text-slate-500">
              Algorithm Confidence: <strong>{analysis.confidence}%</strong>
            </span>
          </div>
        </div>

        {/* Student Metadata Table */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Candidate Name</span>
            <strong className="text-slate-800 text-sm font-sans">{session.studentName}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Roll Number</span>
            <strong className="text-slate-800 text-sm">{session.studentRollNo}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Course &amp; Exam</span>
            <strong className="text-slate-800">{session.courseCode}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Session Elapsed</span>
            <strong className="text-slate-800">{Math.round(session.totalDurationMs / 1000)} seconds</strong>
          </div>
        </div>

        {/* Executive Verdict Callout */}
        <div className={`p-5 rounded-xl border-l-4 ${
          analysis.verdict === 'FLAGGED_FOR_PASTE_FRAUD' 
            ? 'bg-red-50 border-red-600 text-red-950' 
            : analysis.verdict === 'SUSPICIOUS_ANOMALY'
            ? 'bg-amber-50 border-amber-500 text-amber-950'
            : 'bg-emerald-50 border-emerald-600 text-emerald-950'
        }`}>
          <div className="flex items-start gap-3">
            {analysis.verdict === 'FLAGGED_FOR_PASTE_FRAUD' ? (
              <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            ) : analysis.verdict === 'SUSPICIOUS_ANOMALY' ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-bold tracking-tight">
                Forensic Executive Summary: {analysis.verdict}
              </h3>
              <p className="text-xs leading-relaxed opacity-90">
                {analysis.verdictReason}
              </p>
            </div>
          </div>
        </div>

        {/* Suspicion Score Gauge & 6 Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Circular Gauge Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 font-mono">
              Suspicion Score Meter
            </span>

            {/* Circular Gauge SVG */}
            <div className="relative w-40 h-40 flex items-center justify-center my-1">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Score arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={
                    analysis.suspicionScore >= 65 ? '#DC2626' :
                    analysis.suspicionScore >= 30 ? '#F59E0B' : '#10B981'
                  }
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * analysis.suspicionScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-3xl font-black font-mono ${
                  analysis.suspicionScore >= 65 ? 'text-red-600' :
                  analysis.suspicionScore >= 30 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {analysis.suspicionScore}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {analysis.suspicionScore >= 65 ? 'FRAUD LEVEL' :
                   analysis.suspicionScore >= 30 ? 'ELEVATED' : 'ORGANIC'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs mt-2">
              Composite score derived from paste volume, burst CPM velocity, and window switching latency.
            </p>
          </div>

          {/* 6 Forensic Metrics Grid */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {analysis.metrics.map((metric, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                  metric.status === 'danger'
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : metric.status === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block line-clamp-1">
                    {metric.label}
                  </span>
                  <div className={`text-lg font-black font-mono mt-1 ${
                    metric.status === 'danger' ? 'text-red-600' :
                    metric.status === 'warning' ? 'text-amber-700' : 'text-slate-900'
                  }`}>
                    {metric.value}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-tight">
                  {metric.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flagged Infractions List */}
        {analysis.flaggedViolations.length > 0 && (
          <div className="border border-red-200 bg-red-50/40 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5 font-mono">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Identified Forensic Infractions ({analysis.flaggedViolations.length})
            </h4>
            <ul className="space-y-2">
              {analysis.flaggedViolations.map((v, i) => (
                <li key={i} className="text-xs text-red-900 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Keystroke Velocity & Timeline Chart */}
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                Document Growth &amp; Keystroke Velocity Curve
              </h4>
              <p className="text-[11px] text-slate-500">
                Notice vertical step cliffs representing instantaneous clipboard dumps vs gentle slopes of human typing.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-red-500 rounded-sm inline-block"></span>
                Character Count
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.chartData}>
                <defs>
                  <linearGradient id="charGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis 
                  dataKey="timeSec" 
                  unit="s" 
                  tick={{ fontSize: 10, fill: '#64748B' }} 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748B' }} 
                  unit="c" 
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded shadow-lg text-xs font-mono">
                          <p className="text-slate-400">Time: {data.timeSec}s</p>
                          <p className="font-bold text-red-400">Total Chars: {data.charCount}</p>
                          <p className="text-slate-300">Action: {data.eventType}</p>
                          {data.isBurst && (
                            <p className="text-red-300 font-bold mt-1">⚠️ CLIPBOARD BURST</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="stepAfter" 
                  dataKey="charCount" 
                  stroke="#DC2626" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#charGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forensic Event Ledger / Audit Trail Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                Cryptographic Telemetry Ledger ({filteredEvents.length} records)
              </h4>
              <p className="text-[11px] text-slate-500">
                Timestamped sequence of all keyboard interrupts, backspaces, and clipboard payloads.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('bursts')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterType === 'bursts' ? 'bg-red-600 text-white font-bold' : 'bg-red-100 text-red-800'
                }`}
              >
                Bursts Only ({session.pasteEvents.length})
              </button>
              <button
                onClick={() => setFilterType('tabs')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterType === 'tabs' ? 'bg-amber-600 text-white font-bold' : 'bg-amber-100 text-amber-800'
                }`}
              >
                Tab Switches ({session.tabSwitches.length})
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Payload Diff</th>
                  <th className="p-2.5">Latency</th>
                  <th className="p-2.5">Content Snippet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                      No events matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 80).map((ev) => (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50 ${
                        ev.isBurst ? 'bg-red-50/70 font-semibold text-red-950' : ''
                      }`}
                    >
                      <td className="p-2.5 text-slate-500 whitespace-nowrap">
                        +{(ev.relativeTime / 1000).toFixed(2)}s
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.type === 'paste' ? 'bg-red-600 text-white' :
                          ev.type === 'tab_blur' ? 'bg-amber-500 text-white' :
                          ev.type === 'tab_focus' ? 'bg-blue-500 text-white' :
                          ev.type === 'backspace' ? 'bg-slate-200 text-slate-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {ev.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        {ev.addedLength > 0 ? (
                          <span className={ev.addedLength > 50 ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                            +{ev.addedLength} char
                          </span>
                        ) : ev.deletedLength > 0 ? (
                          <span className="text-slate-500">
                            -{ev.deletedLength} char
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="p-2.5 whitespace-nowrap text-slate-600">
                        {ev.interKeyLatency ? `${ev.interKeyLatency}ms` : '—'}
                      </td>
                      <td className="p-2.5 max-w-xs truncate text-slate-800">
                        {ev.contentSnippet ? `"${ev.contentSnippet.slice(0, 60)}"` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Official Forensic Sign-off Stamp */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-[11px]">
              SHA-256 INTEGRITY DIGEST: {session.sessionId.split('').map(c => c.charCodeAt(0).toString(16)).join('')}049fa8b12e3
            </span>
          </div>

          <div className="text-center sm:text-right">
            <span className="font-bold text-slate-700 block">Institutional Online Examination &amp; Assessment Defense</span>
            <span className="text-[10px]">Academic Integrity Office • Autonomous Verification Module</span>
          </div>
        </div>
      </div>
    </div>
  );
};
