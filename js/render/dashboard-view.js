import { WIKIS, escHtml } from "../state.js";
import { getCompletedSet } from "../storage/completions.js";
import { fetchWikiIndex } from "./home-parse.js";
import { extractTrackArticlePaths } from "./learning-paths.js";
import { dirOf, fetchText, normalizePath, setBreadcrumb } from "./nav-utils.js";
import { navigate, showView } from "./router.js";

/* PROGRESS DASHBOARD — three levels: wiki cards → per-section bars → per-learning-path bars. Back nav via the hash router each level. */

function _bar(label, completedCount, total, onClick) {
  const pct = total ? Math.round((completedCount / total) * 100) : 0;
  const clickable = onClick ? ' role="button" tabindex="0"' : "";
  return `
    <section class="dashboard-card${onClick ? " dashboard-card--link" : ""}" data-nav-target="${onClick ? escHtml(onClick) : ""}"${clickable}>
      <h2 class="dashboard-card-title">${escHtml(label)}</h2>
      <div class="dashboard-stat">
        <div class="dashboard-stat-label">
          <span>Completed</span>
          <span>${completedCount} / ${total} (${pct}%)</span>
        </div>
        <div class="dashboard-bar-track">
          <div class="dashboard-bar-fill dashboard-bar-fill--completed" style="width: ${pct}%"></div>
        </div>
      </div>
    </section>`;
}

function _wireCardClicks(container) {
  container.querySelectorAll("[data-nav-target]").forEach((el) => {
    const target = el.dataset.navTarget;
    if (!target) return;
    el.addEventListener("click", () => navigate(target));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(target);
      }
    });
  });
}

async function renderDashboard() {
  setBreadcrumb("dashboard-breadcrumb", [{ label: "Home", href: "#" }, { label: "Dashboard" }]);
  showView("view-dashboard");
  document.querySelector(".page-title").textContent = "Dashboard";
  document.querySelector(".page-subtitle").textContent = "Your progress across each vertical";

  const container = document.getElementById("dashboard-cards");
  container.innerHTML = '<p class="dashboard-empty">Loading…</p>';

  try {
    const cards = [];
    for (const wiki of WIKIS) {
      const sections = await fetchWikiIndex(wiki);
      const paths = sections.flatMap((s) => s.cards.map((c) => normalizePath(c.path)));
      if (!paths.length) continue;

      const completedSet = getCompletedSet(wiki.id);
      const completedCount = paths.filter((p) => completedSet.has(p)).length;
      cards.push(_bar(wiki.title, completedCount, paths.length, `dashboard/${wiki.id}`));
    }

    container.innerHTML = cards.length
      ? cards.join("")
      : '<p class="dashboard-empty">No content yet.</p>';
    _wireCardClicks(container);
  } catch {
    container.innerHTML = '<p class="dashboard-empty">Failed to load progress.</p>';
  }
}

async function renderDashboardWiki(wikiId) {
  const wiki = WIKIS.find((w) => w.id === wikiId);
  if (!wiki) {
    navigate("dashboard");
    return;
  }

  setBreadcrumb("dashboard-breadcrumb", [
    { label: "Home", href: "#" },
    { label: "Dashboard", href: "#dashboard" },
    { label: wiki.title },
  ]);
  showView("view-dashboard");
  document.querySelector(".page-title").textContent = wiki.title;
  document.querySelector(".page-subtitle").textContent = "Progress by section";

  const container = document.getElementById("dashboard-cards");
  container.innerHTML = '<p class="dashboard-empty">Loading…</p>';

  try {
    const sections = await fetchWikiIndex(wiki);
    const completedSet = getCompletedSet(wiki.id);

    const cards = sections
      .map((section) => {
        const paths = section.cards.map((c) => normalizePath(c.path));
        if (!paths.length) return null;
        const completedCount = paths.filter((p) => completedSet.has(p)).length;
        const isLearningPaths = section.heading === "Learning Paths";
        const target = isLearningPaths ? `dashboard/${wiki.id}/paths` : null;
        return _bar(section.heading, completedCount, paths.length, target);
      })
      .filter(Boolean);

    container.innerHTML = cards.length
      ? cards.join("")
      : '<p class="dashboard-empty">No content yet.</p>';
    _wireCardClicks(container);
  } catch {
    container.innerHTML = '<p class="dashboard-empty">Failed to load progress.</p>';
  }
}

async function renderDashboardPaths(wikiId) {
  const wiki = WIKIS.find((w) => w.id === wikiId);
  if (!wiki) {
    navigate("dashboard");
    return;
  }

  setBreadcrumb("dashboard-breadcrumb", [
    { label: "Home", href: "#" },
    { label: "Dashboard", href: "#dashboard" },
    { label: wiki.title, href: `#dashboard/${wiki.id}` },
    { label: "Learning Paths" },
  ]);
  showView("view-dashboard");
  document.querySelector(".page-title").textContent = "Learning Paths";
  document.querySelector(".page-subtitle").textContent = `${wiki.title} progress by path`;

  const container = document.getElementById("dashboard-cards");
  container.innerHTML = '<p class="dashboard-empty">Loading…</p>';

  try {
    const sections = await fetchWikiIndex(wiki);
    const pathsSection = sections.find((s) => s.heading === "Learning Paths");
    const completedSet = getCompletedSet(wiki.id);

    const cards = [];
    for (const card of pathsSection?.cards ?? []) {
      try {
        const trackMd = await fetchText(card.path);
        const trackDir = dirOf(card.path);
        const articlePaths = extractTrackArticlePaths(trackMd, trackDir).map(normalizePath);
        if (!articlePaths.length) continue;
        const completedCount = articlePaths.filter((p) => completedSet.has(p)).length;
        cards.push(_bar(card.title, completedCount, articlePaths.length));
      } catch {}
    }

    container.innerHTML = cards.length
      ? cards.join("")
      : '<p class="dashboard-empty">No learning paths yet.</p>';
  } catch {
    container.innerHTML = '<p class="dashboard-empty">Failed to load progress.</p>';
  }
}

export { renderDashboard, renderDashboardWiki, renderDashboardPaths };
