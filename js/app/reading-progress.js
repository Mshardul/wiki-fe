import { updateProgressRing } from "../content/toc.js";
import { state } from "../state.js";

const progressBar = document.getElementById("reading-progress");

function updateContentReadingProgress() {
  if (state.currentView !== "content" || !progressBar) return;
  const doc = document.documentElement;
  const scrolled = doc.scrollTop || document.body.scrollTop;
  const total = doc.scrollHeight - doc.clientHeight;
  const pct = total > 0 ? scrolled / total : 1;
  progressBar.style.width = `${pct * 100}%`;
  updateProgressRing(pct);
}

export { updateContentReadingProgress };
