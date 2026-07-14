import { getSettings } from "../storage/settings-theme.js";

const VIBRATE_MS = 15;
const TONE_FREQ_HZ = 880;
const TONE_DURATION_S = 0.07;
const TONE_GAIN = 0.05;

let _audioCtx = null;

function _reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function _vibrate() {
  if (!("vibrate" in navigator)) return;
  if (_reducedMotion()) return;
  navigator.vibrate(VIBRATE_MS);
}

// Short synthesized tick - no asset file, just an oscillator burst with a
// quick gain envelope so it clicks rather than pops.
function _playTick() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  _audioCtx ??= new Ctx();
  if (_audioCtx.state === "suspended") _audioCtx.resume();

  const osc = _audioCtx.createOscillator();
  const gain = _audioCtx.createGain();
  osc.frequency.value = TONE_FREQ_HZ;
  osc.connect(gain);
  gain.connect(_audioCtx.destination);

  const now = _audioCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(TONE_GAIN, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + TONE_DURATION_S);

  osc.start(now);
  osc.stop(now + TONE_DURATION_S);
}

// Fires the haptic + sound pair for a study milestone - finishing an article
// (which also covers clearing a section's last unread, since that's just a
// read-completion whose section happens to run out of unread siblings).
// Single settings flag gates both channels.
function fireStudyMilestone() {
  if (!getSettings().hapticFeedback) return;
  _vibrate();
  _playTick();
}

export { fireStudyMilestone };
