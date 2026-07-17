import { navigateToContent } from "../render/content-view.js";
import { fetchPrebuiltBacklinks, fetchPrebuiltSearchIndex } from "../render/nav-utils.js";
import { WIKIS } from "../state.js";
import { buildEdgesForNodes, createGraphSim, destroyGraphSim } from "./graph-engine.js";

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
    for (const section of sections) {
      for (const card of section.cards || []) {
        const path = card.path.startsWith("./") ? card.path : `./${card.path}`;
        nodesByPath.set(path, {
          path,
          title: card.title,
          slug: card.slug,
          wikiId: wiki.id,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          degree: 0,
        });
      }
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

async function openLinkGraph() {
  const modal = document.getElementById("link-graph-modal");
  const canvas = document.getElementById("link-graph-canvas");
  const status = document.getElementById("link-graph-status");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  status.textContent = "Loading graph…";

  const { nodes, edges } = await buildGraph();
  status.textContent = `${nodes.length} articles · ${edges.length} links`;

  _sim = createGraphSim(canvas, nodes, edges, { onNodeClick, colorForNode });
}

function closeLinkGraph() {
  const modal = document.getElementById("link-graph-modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  destroyGraphSim(_sim);
  _sim = null;
}

function isLinkGraphOpen() {
  return !document.getElementById("link-graph-modal").classList.contains("hidden");
}

document.getElementById("link-graph-overlay").addEventListener("click", closeLinkGraph);
document.getElementById("link-graph-close").addEventListener("click", closeLinkGraph);

export { openLinkGraph, closeLinkGraph, isLinkGraphOpen };
