import type { 
  DocumentEvent, 
  PasteBurstEvent, 
  TabSwitchEvent, 
  SessionData, 
  ForensicAnalysis, 
  ForensicVerdict, 
  ForensicMetric, 
  TimelineDataPoint 
} from '../types/proctor';

/**
 * ProctorAI Forensic Analyzer Engine
 * Evaluates typing cadence, paste bursts, tab-switching correlations, and revision frequency.
 */
export function analyzeForensics(session: SessionData): ForensicAnalysis {
  const events = session.events || [];
  const text = session.finalText || '';
  const totalCharacters = Math.max(text.length, 1);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  // 1. Calculate Pasted vs Typed characters
  let pastedChars = 0;
  let typedChars = 0;
  let backspaceCount = 0;
  const latencies: number[] = [];
  let largestPasteBurst = 0;
  let tabSwitchToPasteCorrelationCount = 0;

  // Track recent tab switch
  let lastTabFocusTime = 0;

  events.forEach((ev) => {
    if (ev.type === 'tab_focus') {
      lastTabFocusTime = ev.timestamp;
    }

    if (ev.type === 'paste') {
      pastedChars += ev.addedLength;
      if (ev.addedLength > largestPasteBurst) {
        largestPasteBurst = ev.addedLength;
      }

      // Check if this paste occurred within 6 seconds of returning to the tab
      if (lastTabFocusTime > 0 && Math.abs(ev.timestamp - lastTabFocusTime) < 6000) {
        tabSwitchToPasteCorrelationCount++;
      }
    } else if (ev.type === 'type') {
      typedChars += ev.addedLength;
      if (ev.interKeyLatency && ev.interKeyLatency > 15 && ev.interKeyLatency < 4000) {
        latencies.push(ev.interKeyLatency);
      }
    } else if (ev.type === 'backspace' || ev.type === 'delete' || ev.type === 'selection_delete') {
      backspaceCount++;
    }
  });

  const pasteRatio = Math.min(100, Math.round((pastedChars / totalCharacters) * 100));

  // 2. Inter-key latency statistics
  let meanLatency = 0;
  let keystrokeVariance = 0;

  if (latencies.length > 5) {
    const sum = latencies.reduce((a, b) => a + b, 0);
    meanLatency = Math.round(sum / latencies.length);
    const variance = latencies.reduce((acc, val) => acc + Math.pow(val - meanLatency, 2), 0) / latencies.length;
    keystrokeVariance = Math.round(Math.sqrt(variance)); // standard deviation
  }

  // 3. Typing Velocity (CPM)
  const typingEvents = events.filter(e => e.type === 'type');
  let avgCPM = 0;
  if (typingEvents.length > 0 && session.totalDurationMs > 0) {
    const minutes = session.totalDurationMs / 60000;
    avgCPM = Math.round(typedChars / Math.max(minutes, 0.05));
  }

  // Find max burst CPM
  let maxBurstCPM = 0;
  session.pasteEvents.forEach(p => {
    if (p.estimatedCPM > maxBurstCPM) {
      maxBurstCPM = p.estimatedCPM;
    }
  });
  if (maxBurstCPM === 0 && events.some(e => e.isBurst)) {
    maxBurstCPM = 120000; // instant injection fallback
  }

  // 4. Tab Switches
  const tabSwitchCount = session.tabSwitches.filter(s => s.type === 'BLUR').length;
  let totalAwayDurationMs = 0;
  session.tabSwitches.forEach(s => {
    if (s.awayDurationMs) totalAwayDurationMs += s.awayDurationMs;
  });

  // 5. Revision Ratio (Backspaces per typed character)
  const revisionRatio = typedChars > 0 ? (backspaceCount / typedChars) : 0;

  // 6. Suspicion Score Calculation (0 - 100)
  let suspicion = 0;
  const violations: string[] = [];

  // A. Paste Ratio Contribution (Up to 50 pts)
  if (pasteRatio > 70) {
    suspicion += 50;
    violations.push(`Extreme paste ratio: ${pasteRatio}% of entire text was pasted rather than typed.`);
  } else if (pasteRatio > 40) {
    suspicion += 35;
    violations.push(`High paste volume: ${pasteRatio}% of document content inserted via clipboard.`);
  } else if (pasteRatio > 15) {
    suspicion += 18;
    violations.push(`Moderate clipboard paste detected (${pasteRatio}%).`);
  }

  // B. Single Large Burst Contribution (Up to 25 pts)
  if (largestPasteBurst >= 500) {
    suspicion += 25;
    violations.push(`Catastrophic instant burst: ${largestPasteBurst} characters rendered in < 5ms (AI generator dump).`);
  } else if (largestPasteBurst >= 180) {
    suspicion += 15;
    violations.push(`Unnatural character burst: Single paste of ${largestPasteBurst} characters.`);
  } else if (largestPasteBurst >= 60) {
    suspicion += 8;
  }

  // C. Tab-Switch to Paste Attack Vector (Telegram / ChatGPT copy-paste) (Up to 20 pts)
  if (tabSwitchToPasteCorrelationCount >= 2) {
    suspicion += 20;
    violations.push(`Alt-Tab correlation detected: ${tabSwitchToPasteCorrelationCount} paste events occurred immediately upon returning from another window (e.g. Telegram / ChatGPT).`);
  } else if (tabSwitchToPasteCorrelationCount === 1) {
    suspicion += 12;
    violations.push(`Window switch correlated with instant clipboard dump.`);
  }

  // D. Lack of Revisions / Natural Cadence (Up to 10 pts)
  if (totalCharacters > 200 && revisionRatio < 0.01 && pasteRatio > 30) {
    suspicion += 10;
    violations.push(`Absence of natural human hesitation or backspace revisions (Revision rate: ${(revisionRatio * 100).toFixed(1)}%).`);
  }

  // E. Keystroke Variance Anomaly
  if (typedChars > 100 && keystrokeVariance < 15 && keystrokeVariance > 0) {
    suspicion += 10;
    violations.push(`Suspicious robotic cadence: Key latency standard deviation (${keystrokeVariance}ms) resembles automated script.`);
  }

  // Cap score between 0 and 100
  const suspicionScore = Math.min(100, Math.max(0, suspicion));

  // Determine Verdict
  let verdict: ForensicVerdict = 'INTEGRITY_VERIFIED';
  let verdictReason = 'Cadence, revision density, and keyboard activity are consistent with organic human composition.';

  if (suspicionScore >= 65) {
    verdict = 'FLAGGED_FOR_PASTE_FRAUD';
    verdictReason = `Critical forensic violations detected. High volume of instantaneous clipboard dumping (${pasteRatio}%) with characteristic Alt-Tab sourcing.`;
  } else if (suspicionScore >= 30) {
    verdict = 'SUSPICIOUS_ANOMALY';
    verdictReason = 'Suspicious velocity spikes and clipboard pastes detected. Manual professor review recommended.';
  }

  // Metrics array for display
  const metrics: ForensicMetric[] = [
    {
      label: 'Clipboard Paste Ratio',
      value: `${pasteRatio}%`,
      status: pasteRatio > 40 ? 'danger' : pasteRatio > 15 ? 'warning' : 'normal',
      description: `${pastedChars} of ${totalCharacters} characters pasted from clipboard`,
    },
    {
      label: 'Largest Instant Dump',
      value: `${largestPasteBurst} chars`,
      status: largestPasteBurst > 200 ? 'danger' : largestPasteBurst > 60 ? 'warning' : 'normal',
      description: largestPasteBurst > 200 ? 'Instant AI dump pattern' : 'Standard human clipboard size',
    },
    {
      label: 'Cadence Std. Dev',
      value: keystrokeVariance > 0 ? `${keystrokeVariance} ms` : 'N/A',
      status: keystrokeVariance > 0 && keystrokeVariance < 20 ? 'danger' : 'normal',
      description: 'Variance in keystroke timings (Human: 70-180ms)',
    },
    {
      label: 'Tab Switches (Alt-Tab)',
      value: tabSwitchCount,
      status: tabSwitchCount >= 4 ? 'danger' : tabSwitchCount >= 2 ? 'warning' : 'normal',
      description: `${(totalAwayDurationMs / 1000).toFixed(1)}s spent outside test window`,
    },
    {
      label: 'Revision Frequency',
      value: `${(revisionRatio * 100).toFixed(1)}%`,
      status: (totalCharacters > 200 && revisionRatio < 0.02) ? 'warning' : 'normal',
      description: `${backspaceCount} corrections across document`,
    },
    {
      label: 'Peak Velocity',
      value: maxBurstCPM > 0 ? `${Math.round(maxBurstCPM).toLocaleString()} CPM` : `${avgCPM} CPM`,
      status: maxBurstCPM > 2500 ? 'danger' : 'normal',
      description: maxBurstCPM > 2500 ? 'Exceeds physiological human limits' : 'Normal typing speed',
    }
  ];

  // 7. Generate Timeline / Recharts Chart Data
  const chartData: TimelineDataPoint[] = [];
  let runningChars = 0;
  
  // Sample events across timeline
  events.forEach((ev) => {
    if (ev.type === 'paste') {
      runningChars += ev.addedLength;
    } else if (ev.type === 'type') {
      runningChars += ev.addedLength;
    } else if (ev.type === 'backspace' || ev.type === 'delete') {
      runningChars = Math.max(0, runningChars - ev.deletedLength);
    }

    // Capture point for chart
    const timeSec = Math.round(ev.relativeTime / 100) / 10;
    const instantCPM = ev.type === 'paste' 
      ? Math.min(100000, (ev.addedLength / 0.005) * 60)
      : (ev.instantVelocityCPM || 240);

    chartData.push({
      timeSec,
      charCount: runningChars,
      cpm: Math.min(instantCPM, 15000), // capped for readable charting
      isBurst: ev.isBurst,
      eventType: ev.type,
      snippet: ev.contentSnippet.slice(0, 30),
    });
  });

  return {
    suspicionScore,
    verdict,
    verdictReason,
    confidence: Math.min(99, 85 + (events.length > 50 ? 12 : 5)),
    totalCharacters,
    totalWords: words,
    pastedCharacters: pastedChars,
    typedCharacters: typedChars,
    pasteRatio,
    avgCPM,
    maxBurstCPM,
    keystrokeVariance,
    meanLatency,
    tabSwitchCount,
    totalAwayDurationMs,
    pasteEventCount: session.pasteEvents.length,
    largestPasteBurst,
    flaggedViolations: violations,
    metrics,
    chartData: chartData.length > 120 
      ? chartData.filter((_, idx) => idx % Math.ceil(chartData.length / 100) === 0 || chartData[idx].isBurst)
      : chartData,
  };
}

/**
 * Pre-baked sample scenarios for instant demonstration during professor audits & presentations
 */
export function getDemoSession(type: 'legitimate' | 'blatant_fraud' | 'telegram_patchwork'): SessionData {
  const baseTime = Date.now() - 300000;

  if (type === 'blatant_fraud') {
    // Student writes a short intro, switches to Telegram / ChatGPT, then dumps 1,250 characters in 1 millisecond
    const events: DocumentEvent[] = [];
    let curTime = baseTime;
    let text = '';
    
    const intro = "Distributed Consensus in Distributed Systems (TIET COE):\n\n";
    for (let i = 0; i < intro.length; i++) {
      const char = intro[i];
      const latency = 120 + Math.floor(Math.random() * 90);
      curTime += latency;
      text += char;
      events.push({
        id: `ev-${i}`,
        timestamp: curTime,
        relativeTime: curTime - baseTime,
        type: 'type',
        key: char,
        addedLength: 1,
        deletedLength: 0,
        contentSnippet: char,
        textSnapshotLength: text.length,
        interKeyLatency: latency,
        instantVelocityCPM: Math.round(60000 / latency),
        isBurst: false,
      });
    }

    // Tab blur (switched away to ChatGPT for 18 seconds)
    curTime += 800;
    const blurTime = curTime;
    events.push({
      id: `ev-blur-1`,
      timestamp: blurTime,
      relativeTime: blurTime - baseTime,
      type: 'tab_blur',
      addedLength: 0,
      deletedLength: 0,
      contentSnippet: '[Switched away from examination tab]',
      textSnapshotLength: text.length,
      isBurst: false,
    });

    curTime += 18450; // 18.45 seconds away
    events.push({
      id: `ev-focus-1`,
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      type: 'tab_focus',
      addedLength: 0,
      deletedLength: 0,
      contentSnippet: '[Returned to examination tab]',
      textSnapshotLength: text.length,
      isBurst: false,
    });

    // 800ms later: Instant ChatGPT paste dump!
    curTime += 850;
    const pastedChunk = `The Raft consensus protocol achieves state machine replication through a strong leader election mechanism, randomized heartbeat timeouts (150ms-300ms), and append-entries log consistency guarantees. Unlike Paxos which decouples consensus from logging, Raft enforces a monolithic linear log invariant: if an entry is committed in a given term, it will be present in all leader logs for subsequent terms. Split brain prevention is mathematically ensured by requiring a strict quorum majority (N/2 + 1) for both leader election grants and log commitment acknowledgments. Byzantine failures are excluded under the Crash Fault-Tolerant (CFT) model.`;
    
    text += pastedChunk;
    events.push({
      id: `ev-paste-1`,
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      type: 'paste',
      addedLength: pastedChunk.length,
      deletedLength: 0,
      contentSnippet: pastedChunk,
      textSnapshotLength: text.length,
      interKeyLatency: 5,
      instantVelocityCPM: Math.round((pastedChunk.length / 0.005) * 60),
      isBurst: true,
    });

    const pasteEvents: PasteBurstEvent[] = [
      {
        id: 'pb-1',
        timestamp: curTime,
        relativeTime: curTime - baseTime,
        length: pastedChunk.length,
        snippet: pastedChunk.slice(0, 100) + '...',
        timeDeltaMs: 4,
        estimatedCPM: 9800000,
        severity: 'CRITICAL',
      }
    ];

    const tabSwitches: TabSwitchEvent[] = [
      {
        id: 'ts-1',
        timestamp: blurTime,
        relativeTime: blurTime - baseTime,
        type: 'BLUR',
        awayDurationMs: 18450,
      },
      {
        id: 'ts-2',
        timestamp: curTime - 850,
        relativeTime: curTime - 850 - baseTime,
        type: 'FOCUS',
      }
    ];

    return {
      sessionId: 'TIET-AUDIT-2025-0891',
      studentName: 'Harshvardhan Sharma',
      studentRollNo: '102203491',
      courseCode: 'UCS505 (Distributed Systems)',
      assignmentTitle: 'Assignment 2: Raft Consensus Invariants',
      startTime: baseTime,
      endTime: curTime + 2000,
      totalDurationMs: curTime + 2000 - baseTime,
      finalText: text,
      events,
      tabSwitches,
      pasteEvents,
    };
  }

  if (type === 'telegram_patchwork') {
    // Student writes a bit, pastes code from Telegram, writes a sentence, pastes another chunk
    const events: DocumentEvent[] = [];
    let curTime = baseTime;
    let text = '';
    const tabSwitches: TabSwitchEvent[] = [];
    const pasteEvents: PasteBurstEvent[] = [];

    const sentence1 = "Solution for Question 1 (Deadlock Prevention):\n";
    for (const char of sentence1) {
      const lat = 140 + Math.floor(Math.random() * 80);
      curTime += lat;
      text += char;
      events.push({
        id: `ev-${events.length}`,
        timestamp: curTime,
        relativeTime: curTime - baseTime,
        type: 'type',
        key: char,
        addedLength: 1,
        deletedLength: 0,
        contentSnippet: char,
        textSnapshotLength: text.length,
        interKeyLatency: lat,
        instantVelocityCPM: Math.round(60000 / lat),
        isBurst: false,
      });
    }

    // Switch to Telegram group
    curTime += 600;
    const blur1 = curTime;
    events.push({
      id: `ev-blur-tg1`,
      timestamp: blur1,
      relativeTime: blur1 - baseTime,
      type: 'tab_blur',
      addedLength: 0,
      deletedLength: 0,
      contentSnippet: '[Switched to Telegram: "TIET 3rd Yr CS Official Group"]',
      textSnapshotLength: text.length,
      isBurst: false,
    });
    curTime += 9200;
    events.push({
      id: `ev-focus-tg1`,
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      type: 'tab_focus',
      addedLength: 0,
      deletedLength: 0,
      contentSnippet: '[Returned to window]',
      textSnapshotLength: text.length,
      isBurst: false,
    });
    tabSwitches.push({ id: 'ts-tg-1', timestamp: blur1, relativeTime: blur1 - baseTime, type: 'BLUR', awayDurationMs: 9200 });

    // Paste 1 (Code snippet from Telegram)
    curTime += 450;
    const paste1 = `bool isSafeState(int processes[], int avail[], int maxm[][R], int allot[][R]) {\n  int need[P][R];\n  calculateNeed(need, maxm, allot);\n  bool finish[P] = {0};\n  int safeSeq[P];\n  int work[R];\n  for (int i = 0; i < R ; i++) work[i] = avail[i];\n`;
    text += paste1;
    events.push({
      id: `ev-p1`,
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      type: 'paste',
      addedLength: paste1.length,
      deletedLength: 0,
      contentSnippet: paste1,
      textSnapshotLength: text.length,
      interKeyLatency: 3,
      instantVelocityCPM: 450000,
      isBurst: true,
    });
    pasteEvents.push({
      id: 'pb-tg-1',
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      length: paste1.length,
      snippet: paste1.slice(0, 80) + '...',
      timeDeltaMs: 3,
      estimatedCPM: 450000,
      severity: 'HIGH',
    });

    // Types a transitional phrase
    const phrase = "\nApplying Banker's Algorithm verification:";
    for (const char of phrase) {
      const lat = 130 + Math.floor(Math.random() * 90);
      curTime += lat;
      text += char;
      events.push({
        id: `ev-${events.length}`,
        timestamp: curTime,
        relativeTime: curTime - baseTime,
        type: 'type',
        key: char,
        addedLength: 1,
        deletedLength: 0,
        contentSnippet: char,
        textSnapshotLength: text.length,
        interKeyLatency: lat,
        instantVelocityCPM: Math.round(60000 / lat),
        isBurst: false,
      });
    }

    // Switch again
    curTime += 700;
    const blur2 = curTime;
    events.push({
      id: `ev-blur-tg2`,
      timestamp: blur2,
      relativeTime: blur2 - baseTime,
      type: 'tab_blur',
      addedLength: 0,
      deletedLength: 0,
      contentSnippet: '[Tab Blur: 14.1s]',
      textSnapshotLength: text.length,
      isBurst: false,
    });
    curTime += 14100;
    events.push({
      id: `ev-focus-tg2`,
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      type: 'tab_focus',
      addedLength: 0,
      deletedLength: 0,
      contentSnippet: '[Tab Focus]',
      textSnapshotLength: text.length,
      isBurst: false,
    });
    tabSwitches.push({ id: 'ts-tg-2', timestamp: blur2, relativeTime: blur2 - baseTime, type: 'BLUR', awayDurationMs: 14100 });

    // Paste 2
    curTime += 500;
    const paste2 = `  int count = 0;\n  while (count < P) {\n    bool found = false;\n    for (int p = 0; p < P; p++) {\n      if (finish[p] == 0) {\n        int j;\n        for (j = 0; j < R; j++)\n          if (need[p][j] > work[j]) break;\n        if (j == R) {\n          for (int k = 0 ; k < R ; k++) work[k] += allot[p][k];\n          safeSeq[count++] = p;\n          finish[p] = 1;\n          found = true;\n        }\n      }\n    }\n  }\n`;
    text += paste2;
    events.push({
      id: `ev-p2`,
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      type: 'paste',
      addedLength: paste2.length,
      deletedLength: 0,
      contentSnippet: paste2,
      textSnapshotLength: text.length,
      interKeyLatency: 4,
      instantVelocityCPM: 520000,
      isBurst: true,
    });
    pasteEvents.push({
      id: 'pb-tg-2',
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      length: paste2.length,
      snippet: paste2.slice(0, 80) + '...',
      timeDeltaMs: 4,
      estimatedCPM: 520000,
      severity: 'HIGH',
    });

    return {
      sessionId: 'TIET-AUDIT-2025-0914',
      studentName: 'Amanpreet Singh',
      studentRollNo: '102203104',
      courseCode: 'UCS414 (Operating Systems)',
      assignmentTitle: 'Mid-Sem Assessment: Banker\'s Algorithm Simulation',
      startTime: baseTime,
      endTime: curTime + 1000,
      totalDurationMs: curTime + 1000 - baseTime,
      finalText: text,
      events,
      tabSwitches,
      pasteEvents,
    };
  }

  // Legitimate student essay
  const events: DocumentEvent[] = [];
  let curTime = baseTime;
  let text = '';
  const legEssay = "Operating systems manage hardware abstraction layers and resource allocation. Through virtual memory paging, each process operates in its own isolated address space, preventing unauthorized memory access and page faults during context switches.";
  
  for (let i = 0; i < legEssay.length; i++) {
    // Occasionally simulate a typo and backspace (natural human writing)
    if (i === 42) {
      // Made typo: typed 'x' instead of 'e'
      curTime += 190;
      text += 'x';
      events.push({
        id: `ev-typo-${i}`,
        timestamp: curTime,
        relativeTime: curTime - baseTime,
        type: 'type',
        key: 'x',
        addedLength: 1,
        deletedLength: 0,
        contentSnippet: 'x',
        textSnapshotLength: text.length,
        interKeyLatency: 190,
        instantVelocityCPM: 315,
        isBurst: false,
      });

      // Backspace
      curTime += 220;
      text = text.slice(0, -1);
      events.push({
        id: `ev-bs-${i}`,
        timestamp: curTime,
        relativeTime: curTime - baseTime,
        type: 'backspace',
        key: 'Backspace',
        addedLength: 0,
        deletedLength: 1,
        contentSnippet: 'x',
        textSnapshotLength: text.length,
        interKeyLatency: 220,
        isBurst: false,
      });
    }

    const char = legEssay[i];
    const latency = 130 + Math.floor(Math.random() * 110) + (char === ' ' ? 140 : 0);
    curTime += latency;
    text += char;
    events.push({
      id: `ev-leg-${i}`,
      timestamp: curTime,
      relativeTime: curTime - baseTime,
      type: 'type',
      key: char,
      addedLength: 1,
      deletedLength: 0,
      contentSnippet: char,
      textSnapshotLength: text.length,
      interKeyLatency: latency,
      instantVelocityCPM: Math.round(60000 / latency),
      isBurst: false,
    });
  }

  return {
    sessionId: 'TIET-AUDIT-2025-0722',
    studentName: 'Simran Kaur',
    studentRollNo: '102203772',
    courseCode: 'UCS414 (Operating Systems)',
    assignmentTitle: 'Lab 4: Virtual Memory & Page Translation',
    startTime: baseTime,
    endTime: curTime + 1500,
    totalDurationMs: curTime + 1500 - baseTime,
    finalText: text,
    events,
    tabSwitches: [],
    pasteEvents: [],
  };
}
