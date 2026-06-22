/* ═══════════════════════════════════════════════════════════════
   WIKI DATA - add new wikis here
   ═══════════════════════════════════════════════════════════════ */
const WIKIS = [
  {
    id: "system-design",
    title: "System Design",
    description:
      "Interview-ready references covering components, algorithms, and end-to-end system walkthroughs.",
    icon: "⚙️",
    color: "#6366f1",
    indexPath: "./content/system-design/index.md",
    articleCount: 38,
  },
  {
    id: "dsa",
    title: "Data Structures & Algorithms",
    description:
      "Interview-ready DSA reference: data structures, algorithms, and the patterns that recognise them.",
    icon: "🧩",
    color: "#10b981",
    indexPath: "./content/dsa/index.md",
    articleCount: 0,
  },
];

// Duplicate ids - Warn loudly at startup.
{
  const seen = new Set();
  const dupes = WIKIS.map((w) => w.id).filter((id) => seen.size === seen.add(id).size);
  if (dupes.length) {
    console.warn(
      `WIKIS registry has duplicate id(s): ${[...new Set(dupes)].join(", ")}. Storage keys will collide. Ids must be unique.`,
    );
  }
}

/* ═══════════════════════════════════════════════════════════════
   SHOWDOWN CONVERTER CONFIG
   ═══════════════════════════════════════════════════════════════ */
const mathExtension = () => {
  return [
    {
      type: "lang",
      regex: /\$\$([\s\S]+?)\$\$/g, // Block math
      replace: (match, content) => `¨D${btoa(unescape(encodeURIComponent(content)))}¨D`,
    },
    {
      type: "lang",
      // Inline math: requires non-space characters next to the $ signs to avoid matching bash prompts
      regex: /\$(?!\s)([^$\n]*?\S)\$/g,
      replace: (match, content) => `¨d${btoa(unescape(encodeURIComponent(content)))}¨d`,
    },
    {
      type: "output",
      regex: /¨D([A-Za-z0-9+/=]+)¨D/g,
      replace: (match, content) => `$$${decodeURIComponent(escape(atob(content)))}$$`,
    },
    {
      type: "output",
      regex: /¨d([A-Za-z0-9+/=]+)¨d/g,
      replace: (match, content) => `$${decodeURIComponent(escape(atob(content)))}$`,
    },
  ];
};

const tabsExtension = () => {
  return [
    {
      type: "lang",
      regex: /<!--\s*tabs\s+id="([^"]+)"(?:\s+title="([^"]*)")?\s*-->/g,
      replace: (match, id, title) =>
        `<div data-tabs-id="${id}"${title ? ` data-tabs-title="${title}"` : ""}>`,
    },
    {
      type: "lang",
      regex: /<!--\s*\/tabs\s+id="([^"]+)"\s*-->/g,
      replace: () => "</div>",
    },
  ];
};

const mdConverter = new showdown.Converter({
  ghCompatibleHeaderId: true,
  noHeaderId: false,
  tables: true,
  strikethrough: true,
  simpleLineBreaks: true,
  openLinksInNewWindow: false,
  disableForced4SpacesIndentedSublists: true,
  extensions: [mathExtension, tabsExtension],
});

if (typeof mermaid !== "undefined") {
  mermaid.initialize({
    startOnLoad: false,
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
  });
}

/* ═══════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════ */
const state = {
  currentView: "home",
  currentWikiId: null,
  currentFilePath: null,
  currentTitle: null,
  indexSections: [],
  tocObserver: null,
  titleObserver: null,
  tableResizeObservers: [],
  // Auth identity — in-memory only, NEVER persisted to localStorage.
  // status: "loading" until GET /auth/me resolves, then "in" | "out".
  session: { user: null, status: "loading" },
};

/* ─── Shared caches (mutated by render.js and search.js - must live here) ─── */
const readTimeCache = {};
const indexCache = {};
const allSearchCache = { loaded: false, loading: false, entries: [] };
const synonymCache = { loaded: false, map: {} };

async function loadSynonyms() {
  if (synonymCache.loaded) return;
  try {
    const res = await fetch("./data/synonyms.json");
    if (!res.ok) return;
    const raw = await res.json();
    const expanded = {};
    for (const [term, syns] of Object.entries(raw)) {
      const tl = term.toLowerCase();
      expanded[tl] = syns.map((s) => s.toLowerCase());
      for (const syn of syns) {
        const sl = syn.toLowerCase();
        if (!expanded[sl]) expanded[sl] = [];
        if (!expanded[sl].includes(tl)) expanded[sl].push(tl);
      }
    }
    synonymCache.map = expanded;
    synonymCache.loaded = true;
  } catch {}
}

const STUB_PATHS_KEY = "wiki-stub-paths";
function loadStubPaths() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STUB_PATHS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function markStubPath(normalizedPath) {
  readTimeCache[normalizedPath] = null;
  const set = loadStubPaths();
  if (!set.has(normalizedPath)) {
    set.add(normalizedPath);
    try {
      sessionStorage.setItem(STUB_PATHS_KEY, JSON.stringify([...set]));
    } catch {}
  }
}
for (const p of loadStubPaths()) readTimeCache[p] = null;
const STUB_THRESHOLD = 5000; // bytes - stubs are template skeletons (~3k of HTML-comment scaffolding); real articles are 8k+

/* ─── Article shape fingerprints (heading/code-block counts) ─── */
const SHAPE_FINGERPRINTS_KEY = "wiki-shape-fingerprints";
function loadShapeFingerprints() {
  try {
    return JSON.parse(sessionStorage.getItem(SHAPE_FINGERPRINTS_KEY) || "{}");
  } catch {
    return {};
  }
}
function getShapeFingerprint(normalizedPath) {
  return loadShapeFingerprints()[normalizedPath] || null;
}
function saveShapeFingerprint(normalizedPath, fingerprint) {
  const all = loadShapeFingerprints();
  all[normalizedPath] = fingerprint;
  try {
    sessionStorage.setItem(SHAPE_FINGERPRINTS_KEY, JSON.stringify(all));
  } catch {}
}

/* ─── Pure utilities (placed here to avoid circular deps between storage/render) ─── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fuzzyMatch(query, text) {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  // Check substring first (fast path)
  if (t.includes(q)) return true;
  // Fuzzy: all chars of query appear in order in text
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export {
  WIKIS,
  state,
  indexCache,
  readTimeCache,
  markStubPath,
  getShapeFingerprint,
  saveShapeFingerprint,
  allSearchCache,
  synonymCache,
  loadSynonyms,
  STUB_THRESHOLD,
  mdConverter,
  escHtml,
  fuzzyMatch,
};
