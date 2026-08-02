import { WIKIS, escHtml } from "../state.js";
import { getCompletedSet } from "../storage/completions.js";
import { getReadSet } from "../storage/read-tracking.js";
import { fetchWikiIndex } from "./home-parse.js";
import { setBreadcrumb } from "./nav-utils.js";
import { showView } from "./router.js";

/* ═══════════════════════════════════════════════════════════════
   PROGRESS DASHBOARD
   One card per vertical: read % and completed % against that
   vertical's total article count. Hidden entirely if a vertical
   has zero articles. Pure aggregation - no new tracking state.
   ═══════════════════════════════════════════════════════════════ */

function _renderCard(wiki, total, readCount, completedCount) {
  const readPct = total ? Math.round((readCount / total) * 100) : 0;
  const completedPct = total ? Math.round((completedCount / total) * 100) : 0;

  return `
    <section class="dashboard-card">
      <h2 class="dashboard-card-title">${escHtml(wiki.title)}</h2>
      <div class="dashboard-stat">
        <div class="dashboard-stat-label">
          <span>Read</span>
          <span>${readCount} / ${total} (${readPct}%)</span>
        </div>
        <div class="dashboard-bar-track">
          <div class="dashboard-bar-fill" style="width: ${readPct}%"></div>
        </div>
      </div>
      <div class="dashboard-stat">
        <div class="dashboard-stat-label">
          <span>Completed</span>
          <span>${completedCount} / ${total} (${completedPct}%)</span>
        </div>
        <div class="dashboard-bar-track">
          <div class="dashboard-bar-fill dashboard-bar-fill--completed" style="width: ${completedPct}%"></div>
        </div>
      </div>
    </section>`;
}

async function renderDashboard() {
  setBreadcrumb("dashboard-breadcrumb", [{ label: "Home", href: "#" }, { label: "Dashboard" }]);

  showView("view-dashboard");

  const container = document.getElementById("dashboard-cards");
  container.innerHTML = '<p class="dashboard-empty">Loading…</p>';

  try {
    const cards = [];
    for (const wiki of WIKIS) {
      const sections = await fetchWikiIndex(wiki);
      const paths = sections.flatMap((s) => s.cards.map((c) => c.path));
      if (!paths.length) continue;

      const readSet = getReadSet(wiki.id);
      const completedSet = getCompletedSet(wiki.id);
      const readCount = paths.filter((p) => readSet.has(p)).length;
      const completedCount = paths.filter((p) => completedSet.has(p)).length;
      cards.push(_renderCard(wiki, paths.length, readCount, completedCount));
    }

    container.innerHTML = cards.length
      ? cards.join("")
      : '<p class="dashboard-empty">No content yet.</p>';
  } catch {
    container.innerHTML = '<p class="dashboard-empty">Failed to load progress.</p>';
  }
}

export { renderDashboard };
