import { state } from "../state.js";
import { InterviewLog } from "../storage/interview-mode.js";

/* ═══════════════════════════════════════════════════════════════
   INTERVIEW MODE
   Collapses every fold-region after the first (a position-based cut
   below the problem statement, not the 1/2/3 depth dial), opens the
   notes panel, and times the attempt until the reader reveals the rest.
   ═══════════════════════════════════════════════════════════════ */
let _interviewMode = false;
let _startedAt = 0;
let _tickHandle = null;

function isInterviewMode() {
  return _interviewMode;
}

function _formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function _syncTimerDisplay() {
  const el = document.getElementById("interview-timer");
  if (el) el.textContent = _formatElapsed(Date.now() - _startedAt);
}

function _syncToggleBtn() {
  const btn = document.getElementById("content-interview-btn");
  if (btn) {
    btn.classList.toggle("active", _interviewMode);
    btn.title = _interviewMode ? "Exit interview mode (I)" : "Interview mode (I)";
  }
  const bar = document.getElementById("interview-bar");
  if (bar) bar.classList.toggle("hidden", !_interviewMode);
  const announcer = document.getElementById("a11y-announcer");
  if (announcer) announcer.textContent = _interviewMode ? "Interview mode on" : "Interview mode off";
}

// Position-based cut: first heading + its fold-region stays visible, everything after hides
function _foldRegions(contentEl) {
  contentEl.querySelectorAll(".fold-region").forEach((region, i) => {
    region.classList.toggle("interview-hidden", i > 0);
  });
  contentEl.querySelectorAll("h2, h3, h4").forEach((h, i) => {
    if (i > 0) h.classList.add("interview-hidden");
  });
}

function _unfoldRegions(contentEl) {
  contentEl.querySelectorAll(".interview-hidden").forEach((el) => {
    el.classList.remove("interview-hidden");
  });
}

function _openScratchpad() {
  const panel = document.getElementById("notes-scratchpad");
  const textarea = document.getElementById("notes-scratchpad-input");
  if (!panel) return;
  panel.classList.remove("notes-scratchpad--collapsed");
  localStorage.removeItem(`wiki-notes-collapsed-${state.currentWikiId}`);
  textarea?.focus();
}

function toggleInterviewMode() {
  const contentEl = document.getElementById("markdown-body");
  if (!contentEl) return;

  if (_interviewMode) {
    revealInterviewMode();
    return;
  }

  _interviewMode = true;
  _startedAt = Date.now();
  _foldRegions(contentEl);
  _openScratchpad();
  _syncTimerDisplay();
  _tickHandle = setInterval(_syncTimerDisplay, 1000);
  _syncToggleBtn();
}

function revealInterviewMode() {
  if (!_interviewMode) return;
  const elapsedMs = Date.now() - _startedAt;
  if (state.currentWikiId && state.currentFilePath) {
    InterviewLog.add(state.currentWikiId, state.currentFilePath, elapsedMs);
  }
  const contentEl = document.getElementById("markdown-body");
  if (contentEl) _unfoldRegions(contentEl);
  clearInterval(_tickHandle);
  _tickHandle = null;
  _interviewMode = false;
  _syncToggleBtn();
}

// Per-article teardown: clears timer/UI without logging elapsed time - navigating away isn't a completed rep
function cleanupInterviewMode() {
  if (!_interviewMode) return;
  clearInterval(_tickHandle);
  _tickHandle = null;
  _interviewMode = false;
  _syncToggleBtn();
}

export { toggleInterviewMode, revealInterviewMode, cleanupInterviewMode, isInterviewMode };
