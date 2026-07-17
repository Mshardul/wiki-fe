const NODE_RADIUS = 5;
const HIT_RADIUS = 10;
const LINK_DISTANCE = 70;
const CHARGE = -220;
const CENTER_STRENGTH = 0.02;
const DAMPING = 0.85;

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
  const { nodes, edges, width, height } = sim;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < 0.01) distSq = 0.01;
      const dist = Math.sqrt(distSq);
      const force = CHARGE / distSq;
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
    const diff = (dist - LINK_DISTANCE) / dist;
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
    n.vx += (cx - n.x) * CENTER_STRENGTH;
    n.vy += (cy - n.y) * CENTER_STRENGTH;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
  }
}

function themeColor(varName, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function draw(sim) {
  const { ctx, width, height, nodes, edges, hovered, colorForNode } = sim;
  ctx.clearRect(0, 0, width, height);

  const edgeColor = themeColor("--border", "#3a3a3a");
  const nodeColor = themeColor("--text-secondary", "#999");
  const activeColor = themeColor("--accent", "#6366f1");
  const textColor = themeColor("--text", "#eee");

  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const e of edges) {
    ctx.moveTo(e.source.x, e.source.y);
    ctx.lineTo(e.target.x, e.target.y);
  }
  ctx.stroke();

  for (const n of nodes) {
    const isHovered = n === hovered;
    const r = NODE_RADIUS + Math.min(n.degree, 8) * 0.6;
    ctx.beginPath();
    ctx.arc(n.x, n.y, isHovered ? r + 2 : r, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? activeColor : colorForNode?.(n) || nodeColor;
    ctx.fill();

    if (isHovered) {
      ctx.font = "12px sans-serif";
      ctx.fillStyle = textColor;
      ctx.fillText(n.title, n.x + r + 6, n.y + 4);
    }
  }
}

function nodeAt(sim, x, y) {
  for (let i = sim.nodes.length - 1; i >= 0; i--) {
    const n = sim.nodes[i];
    const dx = n.x - x;
    const dy = n.y - y;
    if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) return n;
  }
  return null;
}

function loop(sim) {
  tick(sim);
  draw(sim);
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

/**
 * Wires a force-directed graph sim onto a canvas. `onNodeClick(node)` fires on click-through.
 * `colorForNode(node)` optionally colors nodes (falls back to a theme neutral).
 * Returns the sim handle; call `destroyGraphSim(sim)` to tear down.
 */
function createGraphSim(canvas, nodes, edges, { onNodeClick, colorForNode } = {}) {
  const ctx = canvas.getContext("2d");
  const sim = {
    canvas,
    ctx,
    nodes,
    edges,
    hovered: null,
    dragging: null,
    raf: null,
    width: 0,
    height: 0,
    colorForNode,
  };
  resizeCanvas(sim);
  seedPositions(nodes, sim.width, sim.height);

  sim._onResize = () => resizeCanvas(sim);
  sim._onMouseMove = (e) => {
    const p = canvasPoint(sim, e);
    if (sim.dragging) {
      sim.dragging.x = p.x;
      sim.dragging.y = p.y;
      sim.dragging.vx = 0;
      sim.dragging.vy = 0;
      return;
    }
    const hit = nodeAt(sim, p.x, p.y);
    sim.hovered = hit;
    canvas.style.cursor = hit ? "pointer" : "default";
  };
  sim._onMouseDown = (e) => {
    const p = canvasPoint(sim, e);
    sim.dragging = nodeAt(sim, p.x, p.y);
  };
  sim._onMouseUp = () => {
    sim.dragging = null;
  };
  sim._onClick = (e) => {
    const p = canvasPoint(sim, e);
    const hit = nodeAt(sim, p.x, p.y);
    if (hit) onNodeClick?.(hit);
  };

  canvas.addEventListener("mousemove", sim._onMouseMove);
  canvas.addEventListener("mousedown", sim._onMouseDown);
  canvas.addEventListener("mouseup", sim._onMouseUp);
  canvas.addEventListener("click", sim._onClick);
  window.addEventListener("resize", sim._onResize);

  loop(sim);
  return sim;
}

function destroyGraphSim(sim) {
  if (!sim) return;
  if (sim.raf) cancelAnimationFrame(sim.raf);
  sim.canvas.removeEventListener("mousemove", sim._onMouseMove);
  sim.canvas.removeEventListener("mousedown", sim._onMouseDown);
  sim.canvas.removeEventListener("mouseup", sim._onMouseUp);
  sim.canvas.removeEventListener("click", sim._onClick);
  window.removeEventListener("resize", sim._onResize);
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

export { createGraphSim, destroyGraphSim, buildEdgesForNodes };
