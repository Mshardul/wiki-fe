import { navigateToContent } from "../render/content-view.js";
import { fetchPrebuiltBacklinks, fetchPrebuiltSearchIndex } from "../render/nav-utils.js";
import { state } from "../state.js";
import { isRead } from "../storage/read-tracking.js";
import { buildEdgesForNodes, createGraphSim, destroyGraphSim } from "./graph-engine.js";

let _sim = null;

function normalizeCardPath(path) {
  return path.startsWith("./") ? path : `./${path}`;
}

async function currentSectionNodes() {
  const wikiId = state.currentWikiId;
  const currentPath = state.currentFilePath ? `./${state.currentFilePath}` : null;
  if (!wikiId || !currentPath) return null;

  const allIndexes = await fetchPrebuiltSearchIndex();
  const sections = allIndexes?.[wikiId] || [];
  const section = sections.find((s) =>
    (s.cards || []).some((c) => normalizeCardPath(c.path) === currentPath),
  );
  if (!section) return null;

  return { wikiId, heading: section.heading, cards: section.cards || [] };
}

function colorForNode(n) {
  if (n.isCurrent) return "var(--accent)";
  return n.read ? "var(--text-subtle)" : "var(--text-body)";
}

function onNodeClick(node) {
  closeSectionMap();
  navigateToContent(
    node.wikiId,
    encodeURIComponent(node.path.replace(/^\.\//, "")),
    encodeURIComponent(node.title),
    node.slug,
  );
}

function getOverlay() {
  return document.getElementById("section-map-overlay");
}

async function openSectionMap() {
  if (isSectionMapOpen()) return;
  const section = await currentSectionNodes();
  if (!section) return;

  const overlay = getOverlay();
  const canvas = document.getElementById("section-map-canvas");
  const status = document.getElementById("section-map-status");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  status.textContent = section.heading;

  const currentPath = `./${state.currentFilePath}`;
  const nodesByPath = new Map();
  for (const card of section.cards) {
    const path = normalizeCardPath(card.path);
    nodesByPath.set(path, {
      path,
      title: card.title,
      slug: card.slug,
      wikiId: section.wikiId,
      isCurrent: path === currentPath,
      read: isRead(path.replace(/^\.\//, "")),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      degree: 0,
    });
  }

  const backlinks = await fetchPrebuiltBacklinks();
  const edges = buildEdgesForNodes(nodesByPath, backlinks);
  const nodes = [...nodesByPath.values()];

  _sim = createGraphSim(canvas, nodes, edges, { onNodeClick, colorForNode });
}

function closeSectionMap() {
  const overlay = getOverlay();
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  destroyGraphSim(_sim);
  _sim = null;
}

function isSectionMapOpen() {
  return getOverlay().classList.contains("open");
}

function toggleSectionMap() {
  if (isSectionMapOpen()) closeSectionMap();
  else openSectionMap();
}

document.getElementById("section-map-overlay").addEventListener("click", (e) => {
  if (e.target.id === "section-map-overlay") closeSectionMap();
});

export { openSectionMap, closeSectionMap, toggleSectionMap, isSectionMapOpen };
