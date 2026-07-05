import { WIKIS, state } from "../state.js";
import { getSettings } from "../storage/settings-theme.js";

/* ─── Clipboard helper with execCommand fallback for HTTP contexts ─── */
function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("style", "position:fixed;top:-9999px;left:-9999px;opacity:0");
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

/* Languages that use # for line comments; everything else gets // */
const HASH_COMMENT_LANGS = new Set([
  "python",
  "py",
  "ruby",
  "rb",
  "bash",
  "sh",
  "shell",
  "yaml",
  "yml",
  "r",
  "perl",
]);

function buildSourceHeader(lang) {
  if (!getSettings().copySourceHeader) return "";
  const title = state.currentTitle;
  if (!title) return "";
  const wiki = WIKIS.find((w) => w.id === state.currentWikiId);
  const origin = wiki ? `${title} · ${wiki.title} wiki` : `${title} · wiki`;
  const prefix = HASH_COMMENT_LANGS.has((lang || "").toLowerCase()) ? "#" : "//";
  return `${prefix} from: ${origin}\n`;
}

/* ─── Code Block Header (traffic lights + lang label + copy button) ─── */
function addCodeBlockHeader(contentEl, onCopyError = () => {}) {
  contentEl.querySelectorAll("pre").forEach((pre) => {
    const code = pre.querySelector("code");
    const header = document.createElement("div");
    header.className = "code-header";

    // Traffic lights
    const lights = document.createElement("div");
    lights.className = "code-traffic-lights";
    lights.setAttribute("aria-hidden", "true");
    ["tl-red", "tl-yellow", "tl-green"].forEach((cls) => {
      const dot = document.createElement("span");
      dot.className = `tl ${cls}`;
      lights.appendChild(dot);
    });
    header.appendChild(lights);

    // Lang label (centered in header) - only for languages from the fence info string,
    // not hljs auto-detection guesses on untagged blocks
    const langMatch = code?.className.match(/language-(\w+)/);
    if (langMatch && langMatch[1] !== "mermaid" && code?.dataset.langExplicit === "true") {
      const label = document.createElement("span");
      label.className = "code-lang-label";
      label.textContent = langMatch[1];
      header.appendChild(label);
      pre.classList.add("has-lang-label");
    }

    pre.insertBefore(header, pre.firstChild);

    // Copy button - floats inside code body, hidden until hover
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.title = "Copy code";
    btn.setAttribute("aria-label", "Copy code");
    btn.textContent = "⧉";
    btn.addEventListener("click", () => {
      const raw = code ? code.textContent : pre.textContent;
      const text = buildSourceHeader(langMatch?.[1]) + raw;
      writeToClipboard(text)
        .then(() => {
          btn.textContent = "✓";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "⧉";
            btn.classList.remove("copied");
          }, 2000);
        })
        .catch(() => onCopyError());
    });
    pre.appendChild(btn);
  });
}

/* Keep addCopyButtons as alias so existing tests referencing it still compile */
function addCopyButtons(contentEl, onCopyError = () => {}) {
  addCodeBlockHeader(contentEl, onCopyError);
}

/* ─── hljs Theme Sync ─── */
const HLJS_DARK =
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
const HLJS_LIGHT =
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css";

function syncHljsTheme() {
  const link = document.getElementById("hljs-theme-css");
  if (!link) return;
  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  link.href = theme === "light" ? HLJS_LIGHT : HLJS_DARK;
}

/* ═══════════════════════════════════════════════════════════════
   COLLAPSIBLE LONG CODE BLOCKS
   ═══════════════════════════════════════════════════════════════ */
function addCollapsibleCodeBlocks(contentEl) {
  contentEl.querySelectorAll("pre").forEach((pre) => {
    const code = pre.querySelector("code");
    const lineCount = (code || pre).textContent.split("\n").length;
    if (lineCount <= 20) return;

    pre.classList.add("pre--collapsible");

    const btn = document.createElement("button");
    btn.className = "code-expand-btn";
    btn.textContent = "Show more";
    btn.addEventListener("click", () => {
      const expanded = pre.classList.toggle("pre--expanded");
      btn.textContent = expanded ? "Show less" : "Show more";
      if (!expanded) pre.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    pre.appendChild(btn);
  });
}

function addPreOverflowDetection(contentEl) {
  contentEl.querySelectorAll("pre").forEach((pre) => {
    const update = () => {
      pre.classList.toggle("pre--overflowing", pre.scrollWidth > pre.clientWidth + 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(pre);
    state.preResizeObservers.push(ro);
  });
}

/* ═══════════════════════════════════════════════════════════════
   CODE BLOCK LINE NUMBERS
   ═══════════════════════════════════════════════════════════════ */
/* Splits highlighted innerHTML into per-line chunks. */
function splitHighlightedLines(html) {
  const lines = [];
  let current = "";
  const stack = [];
  let i = 0;
  while (i < html.length) {
    const nextTag = html.indexOf("<", i);
    const nextNl = html.indexOf("\n", i);
    if (nextNl !== -1 && (nextTag === -1 || nextNl < nextTag)) {
      current += html.slice(i, nextNl);
      lines.push(current + "</span>".repeat(stack.length));
      current = stack.map((attrs) => `<span${attrs}>`).join("");
      i = nextNl + 1;
      continue;
    }
    if (nextTag === -1) {
      current += html.slice(i);
      break;
    }
    current += html.slice(i, nextTag);
    if (html.startsWith("</span>", nextTag)) {
      stack.pop();
      current += "</span>";
      i = nextTag + "</span>".length;
    } else {
      const closeIdx = html.indexOf(">", nextTag);
      const tag = html.slice(nextTag, closeIdx + 1);
      const attrs = tag.slice("<span".length, -1);
      stack.push(attrs);
      current += tag;
      i = closeIdx + 1;
    }
  }
  lines.push(current);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function addLineNumbers(contentEl) {
  contentEl.querySelectorAll("pre code").forEach((code) => {
    if (code.classList.contains("language-mermaid")) return;
    const lines = splitHighlightedLines(code.innerHTML);
    if (lines.length < 3) return;
    code.innerHTML = lines.map((line) => `<span class="code-line">${line}</span>`).join("\n");
    code.parentElement.classList.add("has-line-numbers");
  });
}

/* ═══════════════════════════════════════════════════════════════
   CODE LANGUAGE LABELS
   ═══════════════════════════════════════════════════════════════ */
/* Label is now rendered inside code-header by addCodeBlockHeader */
function addCodeLangLabels(_contentEl) {}

export {
  writeToClipboard,
  buildSourceHeader,
  addCodeBlockHeader,
  addCopyButtons,
  syncHljsTheme,
  addCollapsibleCodeBlocks,
  addPreOverflowDetection,
  addLineNumbers,
  addCodeLangLabels,
};
