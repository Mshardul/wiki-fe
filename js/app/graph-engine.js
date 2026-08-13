const NODE_RADIUS = 5;
const HIT_RADIUS = 10;
const LINK_DISTANCE = 70;
const CHARGE = -220;
const CENTER_STRENGTH = 0.02;
const DAMPING = 0.85;
const ALPHA_DECAY = 0.02;
const ALPHA_MIN = 0.001;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.0015;
const LABEL_ZOOM_THRESHOLD = 1.6;

function seedPositions(nodes, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.35;
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    n.x = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 20;
    n.y = cy + Math.sin(angle) * r + (Math.random() - 0.5) * 20;
    n.vx = 0;
    n.vy = 0;
  });
}

function tick(sim) {
  const { nodes, edges, width, height, alpha } = sim;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < 0.01) distSq = 0.01;
      const dist = Math.sqrt(distSq);
      const force = (CHARGE / distSq) * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  for (const e of edges) {
    const dx = e.target.x - e.source.x;
    const dy = e.target.y - e.source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const diff = ((dist - LINK_DISTANCE) / dist) * alpha;
    const fx = dx * diff * 0.05;
    const fy = dy * diff * 0.05;
    e.source.vx += fx;
    e.source.vy += fy;
    e.target.vx -= fx;
    e.target.vy -= fy;
  }

  const cx = width / 2;
  const cy = height / 2;
  for (const n of nodes) {
    if (n === sim.dragging) continue;
    n.vx += (cx - n.x) * CENTER_STRENGTH * alpha;
    n.vy += (cy - n.y) * CENTER_STRENGTH * alpha;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
  }

  sim.alpha = alpha * (1 - ALPHA_DECAY);
}

function themeColor(varName, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function draw(sim) {
  const { ctx, width, height, nodes, edges, hovered, colorForNode, zoom, panX, panY } = sim;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  const edgeColor = themeColor("--border", "#3a3a3a");
  const nodeColor = themeColor("--text-secondary", "#999");
  const activeColor = themeColor("--accent", "#6366f1");
  const textColor = themeColor("--text", "#eee");

  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (const e of edges) {
    ctx.moveTo(e.source.x, e.source.y);
    ctx.lineTo(e.target.x, e.target.y);
  }
  ctx.stroke();

  const showLabels = zoom >= LABEL_ZOOM_THRESHOLD;
  for (const n of nodes) {
    const isHovered = n === hovered;
    const isLocated = n === sim.located;
    const r = NODE_RADIUS + Math.min(n.degree, 8) * 0.6;
    ctx.beginPath();
    ctx.arc(n.x, n.y, isHovered || isLocated ? r + 2 : r, 0, Math.PI * 2);
    ctx.fillStyle = isHovered || isLocated ? activeColor : colorForNode?.(n) || nodeColor;
    ctx.fill();

    if (isHovered || isLocated || showLabels) {
      ctx.font = `${12 / zoom}px sans-serif`;
      ctx.fillStyle = textColor;
      ctx.fillText(n.title, n.x + r + 6 / zoom, n.y + 4 / zoom);
    }
  }
  ctx.restore();
}

function toWorld(sim, x, y) {
  return { x: (x - sim.panX) / sim.zoom, y: (y - sim.panY) / sim.zoom };
}

function nodeAt(sim, x, y) {
  const p = toWorld(sim, x, y);
  const hitR = HIT_RADIUS / sim.zoom;
  for (let i = sim.nodes.length - 1; i >= 0; i--) {
    const n = sim.nodes[i];
    const dx = n.x - p.x;
    const dy = n.y - p.y;
    if (dx * dx + dy * dy <= hitR * hitR) return n;
  }
  return null;
}

function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function zoomAt(sim, screenX, screenY, factor) {
  const newZoom = clampZoom(sim.zoom * factor);
  const worldBefore = toWorld(sim, screenX, screenY);
  sim.zoom = newZoom;
  sim.panX = screenX - worldBefore.x * sim.zoom;
  sim.panY = screenY - worldBefore.y * sim.zoom;
}

// Centers the view on `node` at a legible zoom level; used for search-to-locate.
function locateNode(sim, node) {
  if (!node) return;
  sim.located = node;
  const targetZoom = Math.max(sim.zoom, LABEL_ZOOM_THRESHOLD);
  sim.zoom = clampZoom(targetZoom);
  sim.panX = sim.width / 2 - node.x * sim.zoom;
  sim.panY = sim.height / 2 - node.y * sim.zoom;
  sim.canvas.dataset.locatedTitle = node.title;
}

function loop(sim) {
  if (sim.alpha > ALPHA_MIN || sim.dragging) {
    tick(sim);
    draw(sim);
  }
  sim.raf = requestAnimationFrame(() => loop(sim));
}

function resizeCanvas(sim) {
  const canvas = sim.canvas;
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  sim.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sim.width = rect.width;
  sim.height = rect.height;
}

function canvasPoint(sim, e) {
  const rect = sim.canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// Wires a force-directed graph sim onto canvas; onNodeClick(node) fires on click, colorForNode(node) optionally colors nodes; returns sim handle, tear down via destroyGraphSim(sim).
function createGraphSim(canvas, nodes, edges, { onNodeClick, colorForNode } = {}) {
  const ctx = canvas.getContext("2d");
  const sim = {
    canvas,
    ctx,
    nodes,
    edges,
    hovered: null,
    located: null,
    dragging: null,
    panning: false,
    raf: null,
    width: 0,
    height: 0,
    alpha: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    colorForNode,
  };
  resizeCanvas(sim);
  seedPositions(nodes, sim.width, sim.height);

  sim._onResize = () => resizeCanvas(sim);
  sim._onWheel = (e) => {
    e.preventDefault();
    const p = canvasPoint(sim, e);
    const factor = Math.exp(-e.deltaY * ZOOM_STEP);
    zoomAt(sim, p.x, p.y, factor);
  };
  sim._onMouseMove = (e) => {
    const p = canvasPoint(sim, e);
    if (sim.dragging) {
      const w = toWorld(sim, p.x, p.y);
      sim.dragging.x = w.x;
      sim.dragging.y = w.y;
      sim.dragging.vx = 0;
      sim.dragging.vy = 0;
      return;
    }
    if (sim.panning) {
      sim.panX += p.x - sim._panLast.x;
      sim.panY += p.y - sim._panLast.y;
      sim._panLast = p;
      return;
    }
    const hit = nodeAt(sim, p.x, p.y);
    sim.hovered = hit;
    canvas.style.cursor = hit ? "pointer" : "grab";
  };
  sim._onMouseDown = (e) => {
    const p = canvasPoint(sim, e);
    sim.dragging = nodeAt(sim, p.x, p.y);
    if (sim.dragging) {
      sim.alpha = Math.max(sim.alpha, 0.3);
    } else {
      sim.panning = true;
      sim._panLast = p;
      canvas.style.cursor = "grabbing";
    }
  };
  sim._onMouseUp = () => {
    sim.dragging = null;
    sim.panning = false;
  };
  sim._onClick = (e) => {
    const p = canvasPoint(sim, e);
    const hit = nodeAt(sim, p.x, p.y);
    if (hit) onNodeClick?.(hit);
  };

  let pinchStartDist = null;
  let pinchStartZoom = 1;
  sim._onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStartZoom = sim.zoom;
    }
  };
  sim._onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDist) {
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const rect = canvas.getBoundingClientRect();
      const midX = (a.clientX + b.clientX) / 2 - rect.left;
      const midY = (a.clientY + b.clientY) / 2 - rect.top;
      const targetZoom = clampZoom(pinchStartZoom * (dist / pinchStartDist));
      zoomAt(sim, midX, midY, targetZoom / sim.zoom);
    }
  };
  sim._onTouchEnd = (e) => {
    if (e.touches.length < 2) pinchStartDist = null;
  };

  canvas.addEventListener("wheel", sim._onWheel, { passive: false });
  canvas.addEventListener("mousemove", sim._onMouseMove);
  canvas.addEventListener("mousedown", sim._onMouseDown);
  canvas.addEventListener("mouseup", sim._onMouseUp);
  canvas.addEventListener("click", sim._onClick);
  canvas.addEventListener("touchstart", sim._onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", sim._onTouchMove, { passive: false });
  canvas.addEventListener("touchend", sim._onTouchEnd, { passive: true });
  window.addEventListener("resize", sim._onResize);

  loop(sim);
  return sim;
}

function destroyGraphSim(sim) {
  if (!sim) return;
  if (sim.raf) cancelAnimationFrame(sim.raf);
  sim.canvas.removeEventListener("wheel", sim._onWheel);
  sim.canvas.removeEventListener("mousemove", sim._onMouseMove);
  sim.canvas.removeEventListener("mousedown", sim._onMouseDown);
  sim.canvas.removeEventListener("mouseup", sim._onMouseUp);
  sim.canvas.removeEventListener("click", sim._onClick);
  sim.canvas.removeEventListener("touchstart", sim._onTouchStart);
  sim.canvas.removeEventListener("touchmove", sim._onTouchMove);
  sim.canvas.removeEventListener("touchend", sim._onTouchEnd);
  window.removeEventListener("resize", sim._onResize);
}

// Builds a path->node Map from index-card entries shared by link-graph/section-map/index-graph; decorate(node, card) optionally sets overlay-specific fields.
function buildNodesFromCards(cards, wikiId, decorate) {
  const nodesByPath = new Map();
  for (const card of cards || []) {
    const path = card.path.startsWith("./") ? card.path : `./${card.path}`;
    const node = {
      path,
      title: card.title,
      slug: card.slug,
      wikiId,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      degree: 0,
    };
    decorate?.(node, card);
    nodesByPath.set(path, node);
  }
  return nodesByPath;
}

/** Same as `buildNodesFromCards`, flattening index `sections` into their cards first. */
function buildNodesFromSections(sections, wikiId, decorate) {
  return buildNodesFromCards(
    sections.flatMap((s) => s.cards || []),
    wikiId,
    decorate,
  );
}

function buildEdgesForNodes(nodesByPath, backlinks) {
  const edgeSet = new Set();
  const edges = [];
  if (!backlinks) return edges;
  for (const [targetPath, sources] of Object.entries(backlinks)) {
    const target = nodesByPath.get(targetPath);
    if (!target) continue;
    for (const src of sources) {
      const source = nodesByPath.get(src.path);
      if (!source) continue;
      const key =
        source.path < target.path
          ? `${source.path}|${target.path}`
          : `${target.path}|${source.path}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ source, target });
      source.degree++;
      target.degree++;
    }
  }
  return edges;
}

export {
  createGraphSim,
  destroyGraphSim,
  buildEdgesForNodes,
  buildNodesFromCards,
  buildNodesFromSections,
  locateNode,
};
