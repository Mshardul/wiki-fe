import { writeToClipboard } from "./code-blocks.js";

/* ─── Mermaid Diagrams ─── */
async function renderMermaidDiagrams(contentEl) {
  if (typeof mermaid === "undefined") return;
  const blocks = contentEl.querySelectorAll("pre code.language-mermaid");
  let i = 0;
  for (const block of blocks) {
    const pre = block.parentElement;
    const code = block.textContent.trim();
    try {
      const id = `mermaid-${Date.now()}-${i++}`;
      const { svg } = await mermaid.render(id, code);
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-diagram";
      wrapper.dataset.mermaidSrc = code;
      wrapper.innerHTML = svg;
      _appendMermaidCopyBtn(wrapper);
      pre.replaceWith(wrapper);
    } catch (err) {
      console.warn("Mermaid render failed:", err);
      const errEl = document.createElement("div");
      errEl.className = "mermaid-error";
      errEl.textContent = "Diagram syntax error - could not render";
      pre.replaceWith(errEl);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   MERMAID NODE HOVER CAPTIONS
   ═══════════════════════════════════════════════════════════════ */
function _parseMermaidCaptions(src) {
  const map = {};
  const re = /^\s*%%\s*node-caption:\s*(\S+)\s+"([^"]+)"/gm;
  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    map[m[1].toLowerCase()] = m[2];
  }
  return map;
}

function _parseMermaidSteps(src) {
  const re = /^\s*%%\s*step:\s*(\d+)\s+(\S+)\s+"([^"]+)"/gm;
  const steps = [];
  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    steps.push({
      order: Number.parseInt(m[1], 10),
      nodes: m[2].split(",").map((n) => n.trim().toLowerCase()),
      caption: m[3],
    });
  }
  return steps.sort((a, b) => a.order - b.order);
}

function _getMermaidTooltip() {
  let tip = document.getElementById("mermaid-node-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "mermaid-node-tooltip";
    tip.className = "mermaid-node-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-live", "polite");
    document.body.appendChild(tip);
  }
  return tip;
}

function _findMermaidNodeEls(svg, nodeId) {
  const key = nodeId.toLowerCase();
  const out = [];
  svg.querySelectorAll("g[id], g[class]").forEach((el) => {
    const elId = (el.id || "").toLowerCase();
    const elClass = (el.className?.baseVal || "").toLowerCase();
    const labelText =
      el.querySelector(".label, text, .nodeLabel")?.textContent?.trim().toLowerCase() || "";
    if (elId.includes(key) || elClass.includes(key) || labelText === key) out.push(el);
  });
  return out;
}

function addMermaidNodeCaptions(contentEl) {
  const diagrams = contentEl.querySelectorAll(".mermaid-diagram[data-mermaid-src]");
  const hasAnyCaptions = [...diagrams].some((d) => {
    const src = d.dataset.mermaidSrc || "";
    return Object.keys(_parseMermaidCaptions(src)).length > 0;
  });
  if (!hasAnyCaptions) {
    document.getElementById("mermaid-node-tooltip")?.remove();
    return;
  }

  const tip = _getMermaidTooltip();

  diagrams.forEach((diagram) => {
    const src = diagram.dataset.mermaidSrc || "";
    const captions = _parseMermaidCaptions(src);
    if (!Object.keys(captions).length) return;

    const svg = diagram.querySelector("svg");
    if (!svg) return;

    Object.entries(captions).forEach(([key, caption]) => {
      _findMermaidNodeEls(svg, key).forEach((el) => {
        el.classList.add("has-node-caption");
        el.addEventListener("mouseenter", (e) => {
          tip.textContent = caption;
          tip.classList.add("visible");
          _positionTooltip(tip, e);
        });
        el.addEventListener("mousemove", (e) => _positionTooltip(tip, e));
        el.addEventListener("mouseleave", () => tip.classList.remove("visible"));
      });
    });
  });
}

function _positionTooltip(tip, e) {
  const pad = 12;
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - pad) x = e.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - pad) y = e.clientY - rect.height - pad;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

/* ─── Mermaid Copy Button ─── */
function _appendMermaidCopyBtn(diagram) {
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn mermaid-copy-btn";
  copyBtn.title = "Copy diagram as SVG";
  copyBtn.setAttribute("aria-label", "Copy diagram as SVG");
  copyBtn.textContent = "⧉";
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const svgEl = diagram.querySelector("svg");
    if (!svgEl) return;
    const svgText = new XMLSerializer().serializeToString(svgEl);
    writeToClipboard(svgText).then(() => {
      copyBtn.textContent = "✓";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "⧉";
        copyBtn.classList.remove("copied");
      }, 2000);
    });
  });
  diagram.appendChild(copyBtn);
}

/* ─── Mermaid Step-Through ─── */
function _clearMermaidStepHighlights(diagram) {
  diagram.querySelectorAll(".step-active").forEach((el) => el.classList.remove("step-active"));
}

function _applyMermaidStep(diagram, svg, steps, index) {
  _clearMermaidStepHighlights(diagram);
  const step = steps[index];
  const rail = diagram.querySelector(".mermaid-step-rail");
  const label = diagram.querySelector(".mermaid-step-label");
  const prevBtn = diagram.querySelector(".mermaid-step-prev");
  const nextBtn = diagram.querySelector(".mermaid-step-next");

  step.nodes.forEach((nodeId) => {
    _findMermaidNodeEls(svg, nodeId).forEach((el) => el.classList.add("step-active"));
  });

  if (step.nodes.length > 1) {
    svg.querySelectorAll("path[id], g.edge[id], g[id*='-edge-']").forEach((el) => {
      const elId = (el.id || "").toLowerCase();
      const touchesTwo = step.nodes.filter((n) => elId.includes(n)).length >= 2;
      if (touchesTwo) el.classList.add("step-active");
    });
  }

  if (label) label.textContent = `Step ${index + 1}/${steps.length}: "${step.caption}"`;
  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) nextBtn.disabled = index === steps.length - 1;
  rail?.setAttribute("data-step-index", String(index));
}

function addMermaidStepThrough(contentEl) {
  const diagrams = contentEl.querySelectorAll(".mermaid-diagram[data-mermaid-src]");
  diagrams.forEach((diagram) => {
    const src = diagram.dataset.mermaidSrc || "";
    const steps = _parseMermaidSteps(src);
    if (!steps.length) return;

    let stepIndex = 0;
    let timer = null;

    const stopAutoAdvance = () => {
      if (timer) clearInterval(timer);
      timer = null;
      playBtn.textContent = "▶";
      playBtn.title = "Play step-through";
    };

    const goToStep = (i) => {
      stepIndex = Math.max(0, Math.min(steps.length - 1, i));
      const svg = diagram.querySelector("svg");
      if (svg) _applyMermaidStep(diagram, svg, steps, stepIndex);
      if (stepIndex === steps.length - 1) stopAutoAdvance();
    };

    const playBtn = document.createElement("button");
    playBtn.className = "copy-btn mermaid-step-play-btn";
    playBtn.title = "Play step-through";
    playBtn.setAttribute("aria-label", "Play step-through walkthrough");
    playBtn.textContent = "▶";

    const rail = document.createElement("div");
    rail.className = "mermaid-step-rail";
    rail.hidden = true;

    const prevBtn = document.createElement("button");
    prevBtn.className = "mermaid-step-prev";
    prevBtn.textContent = "◀";
    prevBtn.setAttribute("aria-label", "Previous step");

    const nextBtn = document.createElement("button");
    nextBtn.className = "mermaid-step-next";
    nextBtn.textContent = "▶";
    nextBtn.setAttribute("aria-label", "Next step");

    const label = document.createElement("span");
    label.className = "mermaid-step-label";

    rail.appendChild(prevBtn);
    rail.appendChild(label);
    rail.appendChild(nextBtn);

    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      stopAutoAdvance();
      goToStep(stepIndex - 1);
    });
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      stopAutoAdvance();
      goToStep(stepIndex + 1);
    });

    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (rail.hidden) {
        rail.hidden = false;
        goToStep(0);
      }
      if (timer) {
        stopAutoAdvance();
        return;
      }
      playBtn.textContent = "⏸";
      playBtn.title = "Pause step-through";
      timer = setInterval(() => {
        if (stepIndex >= steps.length - 1) {
          stopAutoAdvance();
          return;
        }
        goToStep(stepIndex + 1);
      }, 2500);
    });

    diagram.appendChild(playBtn);
    diagram.appendChild(rail);

    diagram._stepThroughCleanup = stopAutoAdvance;
  });
}

/* ─── Mermaid Theme Sync ─── */
function getMermaidThemeConfig(theme) {
  if (theme === "light") {
    return {
      theme: "default",
      themeVariables: {
        darkMode: false,
        primaryColor: "#6366f1",
        primaryTextColor: "#1e293b",
        primaryBorderColor: "#e2e8f0",
        lineColor: "#94a3b8",
      },
    };
  }
  return {
    theme: "dark",
    themeVariables: {
      darkMode: true,
      background: "#161b27",
      primaryColor: "#6366f1",
      primaryTextColor: "#f1f5f9",
      primaryBorderColor: "#252d42",
      lineColor: "#64748b",
      secondaryColor: "#1e2537",
      tertiaryColor: "#252d42",
    },
  };
}

async function rerenderMermaidDiagrams() {
  if (typeof mermaid === "undefined") return;
  const contentEl = document.getElementById("markdown-body");
  if (!contentEl) return;
  const diagrams = contentEl.querySelectorAll(".mermaid-diagram[data-mermaid-src]");
  if (!diagrams.length) return;

  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  mermaid.initialize({ startOnLoad: false, ...getMermaidThemeConfig(theme) });

  const inViewport = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };

  let i = 0;
  for (const wrapper of diagrams) {
    if (!inViewport(wrapper)) continue;
    const code = wrapper.dataset.mermaidSrc;
    try {
      wrapper._stepThroughCleanup?.();
      const id = `mermaid-rerender-${Date.now()}-${i++}`;
      const { svg } = await mermaid.render(id, code);
      const existingBtn = wrapper.querySelector(".mermaid-copy-btn");
      const existingPlayBtn = wrapper.querySelector(".mermaid-step-play-btn");
      const existingRail = wrapper.querySelector(".mermaid-step-rail");
      wrapper.innerHTML = svg;
      if (existingBtn) wrapper.appendChild(existingBtn);
      else _appendMermaidCopyBtn(wrapper);
      if (existingPlayBtn) wrapper.appendChild(existingPlayBtn);
      if (existingRail) wrapper.appendChild(existingRail);
    } catch (err) {
      console.warn("Mermaid re-render failed:", err);
      const errEl = document.createElement("div");
      errEl.className = "mermaid-error";
      errEl.textContent = "Diagram syntax error - could not render";
      wrapper.replaceChildren(errEl);
    }
  }
}

export {
  renderMermaidDiagrams,
  addMermaidNodeCaptions,
  addMermaidStepThrough,
  rerenderMermaidDiagrams,
};
