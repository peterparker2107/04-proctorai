# ProctorAI — "You Can't Fake Writing 2,000 Words in 2 Seconds"

> **Academic Integrity Suite** • **Zero API Keys** • **100% Client-Side In-Browser Execution** • **Clinical Forensic Audit**

---

## 🎯 The Core Problem: OA Cheating & Instant LLM Pastes

In college Online Assessments (OAs) and lab assignment submissions, traditional plagiarism checkers fail against newly prompted ChatGPT responses or answers broadcasted live into student **Telegram groups**.

However, there is an inescapable physical truth:
> **A human cannot organically compose and type 1,500 characters in 2 milliseconds.**

**ProctorAI** solves this problem forensically. By continuously recording keystroke intervals, inter-key cadence, backspace revision density, and window focus interrupts, ProctorAI mathematically differentiates between:
1. **Organic human composition** (steady 150–350 CPM, log-normal inter-key latencies, natural backspaces/revisions).
2. **Instantaneous AI clipboard bursts** (dumping 500+ characters in &lt;1ms).
3. **Alt-Tab Telegram leaks** (window blur for 15 seconds followed immediately by a clipboard paste within 800ms of refocusing).

---

## 🔬 Key Features

### 1. Student Submission Interface & Cadence Logger
- **Live Cadence Engine:** Captures every keystroke, backspace, and character difference along with precise relative timestamps.
- **Real-Time Telemetry Bar:** Displays instant Characters Per Minute (CPM), Words Per Minute (WPM), active character counts, and session timer.
- **Alt-Tab Window Blur Tracking:** Records the exact duration the candidate spent outside the examination window.
- **One-Click Test Scenarios:** Built-in scenarios to immediately demonstrate legitimate typing vs. blatant ChatGPT dumps vs. Telegram patchwork leaks.

### 2. Burst / Paste Event Detector
- Detects instant clipboard bursts where large text blocks appear in a single execution tick.
- Records the exact timestamp, character count, payload snippet, and estimated instantaneous CPM (e.g. 9,800,000 CPM).
- Immediate visual HUD alerts when an unnatural burst is recorded.

### 3. Deterministic Writing Replay Player
- Replays the entire document composition step-by-step from blank page to final text.
- Reconstructs typing with natural cadence.
- **Visual Alert Box:** Bright red alert overlay flashes dynamically whenever a paste event is encountered during playback.
- **Timeline Scrubber with Burst Pins:** Red pin markers along the scrub bar pinpoint exactly where clipboard dumps happened.
- Play, Pause, Reset, Jump-to-Next-Burst, and Speed controls (1x, 2x, 5x, 10x).

### 4. Professor Forensic Audit Dashboard
- **Suspicion Score Gauge:** Composite metric (0–100%) indicating fraud probability.
- **Final Forensic Verdicts:**
  - `INTEGRITY_VERIFIED` (Organic human cadence)
  - `SUSPICIOUS_ANOMALY` (Elevated velocity or clipboard activity requiring manual check)
  - `FLAGGED_FOR_PASTE_FRAUD` (Definitive instantaneous clipboard injection)
- **Forensic Metrics Grid:**
  - Paste Ratio (% pasted vs typed)
  - Largest Instant Dump size
  - Keystroke Variance (Standard deviation of inter-key latency)
  - Tab Switch Count & Away Duration
  - Revision Frequency (% backspaces)
  - Peak Velocity
- **Document Growth Curve:** Interactive Recharts step chart revealing vertical step cliffs for paste dumps vs. slopes for typing.
- **Cryptographic Telemetry Ledger:** Detailed table of every event with filter toggles for all events, bursts only, and tab switches.
- **Export & Print:** Print-ready official forensic report styling and one-click JSON audit export.

---

## 🎨 Design System
- **Colors:**
  - Alert Red: `oklch(0.55 0.22 25)`
  - Clinical Light Mode: `oklch(0.98 0.005 25)`
  - Dark Slate & Navy Forensic Accents
- **Typography:** Geist and Geist Mono for clinical, institutional authority.

---

## 🚀 Getting Started

### Prerequisites
Node.js 18+ and npm installed.

### Installation
```bash
cd 04-proctorai
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

---

## 🔒 Security & Privacy Guarantee
- **100% In-Browser Execution:** ProctorAI runs completely offline on the client. No student text or telemetry data leaves the browser.
- **Zero API Keys Required:** Operates autonomously without third-party LLM dependencies.
