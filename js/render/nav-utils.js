/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
function normalizePath(path) {
  const stack = [];
  for (const p of path.split("/")) {
    if (p === "..") {
      if (stack.length) stack.pop();
    } else if (p && p !== ".") stack.push(p);
  }
  return stack.join("/");
}

function dirOf(filePath) {
  return filePath.substring(0, filePath.lastIndexOf("/"));
}

/* ─── Reading time ─── */
function readingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

/* ─── Dynamic Page Title ─── */
function updatePageTitle(title) {
  document.title = `${title} | Wiki App`;
}

/* ─── Robust Relative Path Resolver ─── */
function resolvePath(baseDir, relHref) {
  const hashIdx = relHref.indexOf("#");
  const fragment = hashIdx >= 0 ? relHref.slice(hashIdx) : "";
  const pathPart = hashIdx >= 0 ? relHref.slice(0, hashIdx) : relHref;

  const stack = [];
  for (const p of baseDir.split("/")) if (p) stack.push(p);
  for (const p of pathPart.split("/")) {
    if (p === "..") {
      if (stack.length) stack.pop();
    } else if (p && p !== ".") stack.push(p);
  }
  return stack.join("/") + fragment;
}

/* ═══════════════════════════════════════════════════════════════
   BREADCRUMB HELPER
   ═══════════════════════════════════════════════════════════════ */
function setBreadcrumb(elId, items) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = "";
  items.forEach((item, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "breadcrumb-sep";
      sep.textContent = "›";
      el.appendChild(sep);
    }
    const isLast = i === items.length - 1;
    if (isLast || !item.href) {
      const span = document.createElement("span");
      span.textContent = item.label;
      el.appendChild(span);
    } else {
      const a = document.createElement("a");
      a.className = "breadcrumb-link";
      a.href = item.href;
      a.textContent = item.label;
      el.appendChild(a);
    }
  });
}

async function fetchText(path, signal) {
  let res;
  try {
    res = await fetch(new URL(path, location.href).href, signal ? { signal } : {});
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error(`Network error - check your connection (${err.message})`);
  }
  if (res.status === 404) throw new Error("Page not found (404)");
  if (res.status === 403) throw new Error("Access denied (403)");
  if (res.status >= 500) throw new Error(`Server unavailable (${res.status})`);
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  return res.text();
}

// Pre-built at deploy time (build_search_index.py): { [wikiId]: sections[] }
let _prebuiltIndex;
async function fetchPrebuiltSearchIndex() {
  if (_prebuiltIndex !== undefined) return _prebuiltIndex;
  try {
    const res = await fetch(new URL("./content/search-index.json", location.href).href);
    _prebuiltIndex = res.ok ? await res.json() : null;
  } catch {
    _prebuiltIndex = null;
  }
  return _prebuiltIndex;
}

export {
  normalizePath,
  dirOf,
  readingTime,
  updatePageTitle,
  resolvePath,
  setBreadcrumb,
  fetchText,
  fetchPrebuiltSearchIndex,
};
