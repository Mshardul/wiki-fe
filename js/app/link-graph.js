import { navigateToContent } from "../render/content-view.js";
import { fetchPrebuiltBacklinks, fetchPrebuiltSearchIndex } from "../render/nav-utils.js";
import { WIKIS } from "../state.js";
import {
  buildEdgesForNodes,
  buildNodesFromSections,
  createGraphSim,
  destroyGraphSim,
  locateNode,
} from "./graph-engine.js";

let _graph = null; // { nodes, edges } once built, across all wikis
let _sim = null;

async function buildGraph() {
  if (_graph) return _graph;

  const [backlinks, allIndexes] = await Promise.all([
    fetchPrebuiltBacklinks(),
    fetchPrebuiltSearchIndex(),
  ]);

  const nodesByPath = new Map();
  for (const wiki of WIKIS) {
    const sections = allIndexes?.[wiki.id] || [];
    for (const [path, node] of buildNodesFromSections(sections, wiki.id)) {
      nodesByPath.set(path, node);
    }
  }

  const edges = buildEdgesForNodes(nodesByPath, backlinks);
  const nodes = [...nodesByPath.values()];
  _graph = { nodes, edges };
  return _graph;
}

function colorForNode(n) {
  return WIKIS.find((w) => w.id === n.wikiId)?.color;
}

function onNodeClick(node) {
  closeLinkGraph();
  navigateToContent(
    node.wikiId,
    encodeURIComponent(node.path.replace(/^\.\//, "")),
    encodeURIComponent(node.title),
    node.slug,
  );
}

let _opening = false;

async function openLinkGraph() {
  if (isLinkGraphOpen() || _opening) return;

  _opening = true;
  try {
    const modal = document.getElementById("link-graph-modal");
    const canvas = document.getElementById("link-graph-canvas");
    const status = document.getElementById("link-graph-status");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    status.textContent = "Loading graph…";

    const { nodes, edges } = await buildGraph();
    status.textContent = `${nodes.length} articles · ${edges.length} links`;

    _sim = createGraphSim(canvas, nodes, edges, { onNodeClick, colorForNode });
  } finally {
    _opening = false;
  }
}

function closeLinkGraph() {
  const modal = document.getElementById("link-graph-modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  destroyGraphSim(_sim);
  _sim = null;
  document.getElementById("link-graph-search").value = "";
}

function isLinkGraphOpen() {
  return !document.getElementById("link-graph-modal").classList.contains("hidden");
}

document.getElementById("link-graph-backdrop").addEventListener("click", closeLinkGraph);
document.getElementById("link-graph-close").addEventListener("click", closeLinkGraph);

document.getElementById("link-graph-search").addEventListener("input", (e) => {
  if (!_sim) return;
  const q = e.target.value.trim().toLowerCase();
  const match = q ? _sim.nodes.find((n) => n.title.toLowerCase().includes(q)) : null;
  if (match) locateNode(_sim, match);
});

export { openLinkGraph, closeLinkGraph, isLinkGraphOpen };
