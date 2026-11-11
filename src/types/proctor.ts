export type DocumentEventType = 
  | 'type' 
  | 'paste' 
  | 'backspace' 
  | 'delete' 
  | 'selection_delete'
  | 'tab_blur'
  | 'tab_focus';

export interface DocumentEvent {
  id: string;
  timestamp: number;
  relativeTime: number; // ms from start
  type: DocumentEventType;
  key?: string;
  addedLength: number;
  deletedLength: number;
  contentSnippet: string;
  textSnapshotLength: number;
  interKeyLatency?: number; // ms since previous typing event
  instantVelocityCPM?: number;
  isBurst: boolean;
  position?: number;
}

export interface PasteBurstEvent {
  id: string;
  timestamp: number;
  relativeTime: number;
  length: number;
  snippet: string;
  timeDeltaMs: number;
  estimatedCPM: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface TabSwitchEvent {
  id: string;
  timestamp: number;
  relativeTime: number;
  type: 'BLUR' | 'FOCUS';
  awayDurationMs?: number;
}

export interface SessionData {
  sessionId: string;
  studentName: string;
  studentRollNo: string;
  courseCode: string;
  assignmentTitle: string;
  startTime: number;
  endTime?: number;
  totalDurationMs: number;
  finalText: string;
  events: DocumentEvent[];
  tabSwitches: TabSwitchEvent[];
  pasteEvents: PasteBurstEvent[];
}

export type ForensicVerdict = 
  | 'INTEGRITY_VERIFIED' 
  | 'SUSPICIOUS_ANOMALY' 
  | 'FLAGGED_FOR_PASTE_FRAUD';

export interface ForensicMetric {
  label: string;
  value: string | number;
  unit?: string;
  status: 'normal' | 'warning' | 'danger';
  description: string;
}

export interface TimelineDataPoint {
  timeSec: number;
  charCount: number;
  cpm: number;
  isBurst: boolean;
  eventType: DocumentEventType;
  snippet?: string;
}

export interface ForensicAnalysis {
  suspicionScore: number; // 0 - 100
  verdict: ForensicVerdict;
  verdictReason: string;
  confidence: number;
  totalCharacters: number;
  totalWords: number;
  pastedCharacters: number;
  typedCharacters: number;
  pasteRatio: number; // % (0-100)
  avgCPM: number;
  maxBurstCPM: number;
  keystrokeVariance: number; // std dev in ms
  meanLatency: number; // ms
  tabSwitchCount: number;
  totalAwayDurationMs: number;
  pasteEventCount: number;
  largestPasteBurst: number;
  flaggedViolations: string[];
  metrics: ForensicMetric[];
  chartData: TimelineDataPoint[];
}

export interface ReplayState {
  isPlaying: boolean;
  playbackSpeed: number; // 1, 2, 5, 10
  currentEventIndex: number;
  currentText: string;
  currentEvent: DocumentEvent | null;
  isBurstActive: boolean;
  burstSnippet: string | null;
  progress: number; // 0 - 100
}
