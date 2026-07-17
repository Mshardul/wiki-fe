import { buildEdgesForNodes, createGraphSim, destroyGraphSim } from "../app/graph-engine.js";
import { navigateToContent } from "./content-view.js";
import { fetchPrebuiltBacklinks } from "./nav-utils.js";

let _sim = null;
let _wikiId = null;

function nodesFromSections(sections, wikiId) {
  const nodesByPath = new Map();
  for (const section of sections) {
    for (const card of section.cards || []) {
      const path = card.path.startsWith("./") ? card.path : `./${card.path}`;
      nodesByPath.set(path, {
        path,
        title: card.title,
        slug: card.slug,
        wikiId,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        degree: 0,
      });
    }
  }
  return nodesByPath;
}

function onNodeClick(node) {
  navigateToContent(
    node.wikiId,
    encodeURIComponent(node.path.replace(/^\.\//, "")),
    encodeURIComponent(node.title),
    node.slug,
  );
}

async function renderIndexGraph(sections, wiki) {
  const canvas = document.getElementById("index-graph-canvas");
  if (!canvas) return;

  _wikiId = wiki.id;
  const nodesByPath = nodesFromSections(sections, wiki.id);
  const backlinks = await fetchPrebuiltBacklinks();
  const edges = buildEdgesForNodes(nodesByPath, backlinks);
  const nodes = [...nodesByPath.values()];

  if (_wikiId !== wiki.id) return; // wiki switched while backlinks were loading

  destroyIndexGraph();
  _sim = createGraphSim(canvas, nodes, edges, { onNodeClick, colorForNode: () => wiki.color });
}

function destroyIndexGraph() {
  destroyGraphSim(_sim);
  _sim = null;
}

export { renderIndexGraph, destroyIndexGraph };
