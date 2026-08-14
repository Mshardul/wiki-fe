import {
  createFocusTrap,
  getFocusableIn,
  markModalClosed,
  markModalOpened,
  registerModal,
} from "../modal-registry.js";
import { navigateToContent } from "../render/content-view.js";
import { fetchPrebuiltBacklinks, fetchPrebuiltSearchIndex } from "../render/nav-utils.js";
import { showToast } from "../render/toast.js";
import { state } from "../state.js";
import { isCompleted } from "../storage/completions.js";
import {
  buildEdgesForNodes,
  buildNodesFromCards,
  createGraphSim,
  destroyGraphSim,
  locateNode,
} from "./graph-engine.js";

let _sim = null;
let _focusTrapHandler = null;

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
  return n.completed ? "var(--text-subtle)" : "var(--text-body)";
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

async function _openSectionMap() {
  if (isSectionMapOpen()) return;
  const section = await currentSectionNodes();
  if (!section) {
    showToast("Section map unavailable — this article isn't in the index.");
    return;
  }

  const overlay = getOverlay();
  const canvas = document.getElementById("section-map-canvas");
  const status = document.getElementById("section-map-status");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  status.textContent = section.heading;

  const currentPath = `./${state.currentFilePath}`;
  const nodesByPath = buildNodesFromCards(section.cards, section.wikiId, (node) => {
    node.isCurrent = node.path === currentPath;
    node.completed = isCompleted(node.path.replace(/^\.\//, ""), section.wikiId);
  });

  const backlinks = await fetchPrebuiltBacklinks();
  const edges = buildEdgesForNodes(nodesByPath, backlinks);
  const nodes = [...nodesByPath.values()];

  _sim = createGraphSim(canvas, nodes, edges, { onNodeClick, colorForNode });

  _focusTrapHandler = createFocusTrap(overlay, () => getFocusableIn(overlay));
  overlay.addEventListener("keydown", _focusTrapHandler);
  markModalOpened(sectionMapModal);
}

function closeSectionMap() {
  const overlay = getOverlay();
  if (overlay.classList.contains("hidden")) return;
  markModalClosed(sectionMapModal);
  if (_focusTrapHandler) {
    overlay.removeEventListener("keydown", _focusTrapHandler);
    _focusTrapHandler = null;
  }
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  destroyGraphSim(_sim);
  _sim = null;
  document.getElementById("section-map-search").value = "";
}

function isSectionMapOpen() {
  return !getOverlay().classList.contains("hidden");
}

const sectionMapModal = { isOpen: isSectionMapOpen, close: closeSectionMap };
registerModal(sectionMapModal);

function toggleSectionMap() {
  if (isSectionMapOpen()) closeSectionMap();
  else _openSectionMap();
}

document.getElementById("section-map-overlay").addEventListener("click", (e) => {
  if (e.target.id === "section-map-overlay") closeSectionMap();
});

document.getElementById("section-map-search").addEventListener("input", (e) => {
  if (!_sim) return;
  const q = e.target.value.trim().toLowerCase();
  const match = q ? _sim.nodes.find((n) => n.title.toLowerCase().includes(q)) : null;
  if (match) locateNode(_sim, match);
});

export { closeSectionMap, toggleSectionMap, isSectionMapOpen };
