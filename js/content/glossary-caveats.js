/* ═══════════════════════════════════════════════════════════════
   INLINE CAVEAT REVEALS  [?caveat text]
   ═══════════════════════════════════════════════════════════════ */
const CAVEAT_RE = /\[\\?\?([^\]]+)\]/g;

function addInlineCaveats(contentEl) {
  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentNode?.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "PRE") {
        return NodeFilter.FILTER_REJECT;
      }
      return CAVEAT_RE.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const targets = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    CAVEAT_RE.lastIndex = 0;
    targets.push(n);
  }

  for (const textNode of targets) {
    CAVEAT_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    m = CAVEAT_RE.exec(textNode.nodeValue);
    while (m !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(textNode.nodeValue.slice(last, m.index)));
      }
      const marker = document.createElement("span");
      marker.className = "caveat-marker";
      marker.setAttribute("role", "button");
      marker.setAttribute("tabindex", "0");
      marker.setAttribute("aria-expanded", "false");
      const body = document.createElement("span");
      body.className = "caveat-body";
      body.textContent = m[1];
      body.setAttribute("aria-hidden", "true");
      marker.appendChild(body);

      const toggle = () => {
        const expanded = marker.getAttribute("aria-expanded") === "true";
        marker.setAttribute("aria-expanded", String(!expanded));
        body.setAttribute("aria-hidden", String(expanded));
      };
      marker.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      marker.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });

      frag.appendChild(marker);
      last = m.index + m[0].length;
      m = CAVEAT_RE.exec(textNode.nodeValue);
    }
    if (last < textNode.nodeValue.length) {
      frag.appendChild(document.createTextNode(textNode.nodeValue.slice(last)));
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }
}

/* ─── Glossary Term Hover Popovers ─── */
let _glossaryCache = null;

function _loadGlossary() {
  if (!_glossaryCache) {
    _glossaryCache = fetch("data/glossary.json")
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        for (const [k, v] of Object.entries(data)) map[k.toLowerCase()] = v;
        return map;
      })
      .catch(() => ({}));
  }
  return _glossaryCache;
}

function _getOrCreateGlossaryPopover() {
  let pop = document.getElementById("glossary-popover");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "glossary-popover";
    pop.className = "glossary-popover";
    pop.setAttribute("role", "tooltip");
    document.body.appendChild(pop);
  }
  return pop;
}

function _positionPopover(pop, anchor) {
  const rect = anchor.getBoundingClientRect();
  const gap = 8;
  let top = rect.bottom + gap + window.scrollY;
  let left = rect.left + window.scrollX;

  pop.style.visibility = "hidden";
  pop.style.display = "block";
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  pop.style.display = "";
  pop.style.visibility = "";

  if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
  if (left < 8) left = 8;
  if (rect.bottom + gap + ph > window.innerHeight) top = rect.top - ph - gap + window.scrollY;

  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

/* Tracks currently-rendered glossary terms so a single shared document click
   listener can close them, instead of registering one document-level
   listener per term on every article render (unbounded listener growth). */
const _openGlossaryTerms = new Set();
let _glossaryDocListenerBound = false;

function resetGlossaryExpandTracking() {
  _openGlossaryTerms.clear();
}

function _bindGlossaryDocListener() {
  if (_glossaryDocListenerBound) return;
  _glossaryDocListenerBound = true;
  document.addEventListener(
    "click",
    (e) => {
      _openGlossaryTerms.forEach((entry) => {
        const { abbr, expand } = entry;
        if (!abbr.isConnected) {
          _openGlossaryTerms.delete(entry);
          return;
        }
        if (!abbr.contains(e.target) && !expand.contains(e.target)) {
          abbr.setAttribute("aria-expanded", "false");
          expand.setAttribute("aria-hidden", "true");
          expand.classList.remove("glossary-inline-def--open");
        }
      });
    },
    { passive: true },
  );
}

function addInlineGlossaryExpand(contentEl) {
  const abbrs = Array.from(contentEl.querySelectorAll("abbr"));
  if (!abbrs.length) return;

  _bindGlossaryDocListener();

  _loadGlossary().then((glossary) => {
    const matched = abbrs.filter((el) => glossary[el.textContent.trim().toLowerCase()]);
    if (!matched.length) return;

    matched.forEach((abbr) => {
      const def = glossary[abbr.textContent.trim().toLowerCase()];
      if (!def) return;

      abbr.classList.add("glossary-term", "glossary-term--expandable");
      abbr.setAttribute("role", "button");
      abbr.setAttribute("tabindex", "0");
      abbr.setAttribute("aria-expanded", "false");

      const expand = document.createElement("span");
      expand.className = "glossary-inline-def";
      expand.textContent = def;
      expand.setAttribute("aria-hidden", "true");
      abbr.after(expand);

      _openGlossaryTerms.add({ abbr, expand });

      const toggle = () => {
        const open = abbr.getAttribute("aria-expanded") === "true";
        abbr.setAttribute("aria-expanded", String(!open));
        expand.setAttribute("aria-hidden", String(open));
        expand.classList.toggle("glossary-inline-def--open", !open);
      };

      abbr.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      abbr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    });
  });
}

function addGlossaryTerms(contentEl) {
  const abbrs = Array.from(contentEl.querySelectorAll("abbr"));
  if (!abbrs.length) return;

  _loadGlossary().then((glossary) => {
    const matched = abbrs.filter((el) => glossary[el.textContent.trim().toLowerCase()]);
    if (!matched.length) return;

    const pop = _getOrCreateGlossaryPopover();
    let hideTimer = null;

    const show = (el) => {
      clearTimeout(hideTimer);
      const def = glossary[el.textContent.trim().toLowerCase()];
      if (!def) return;
      pop.textContent = def;
      _positionPopover(pop, el);
      pop.classList.add("glossary-popover--visible");
    };

    const hide = () => {
      hideTimer = setTimeout(() => pop.classList.remove("glossary-popover--visible"), 120);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.addEventListener("mouseenter", el._glossaryShow);
            el.addEventListener("focus", el._glossaryShow);
            el.addEventListener("mouseleave", hide);
            el.addEventListener("blur", hide);
          } else {
            el.removeEventListener("mouseenter", el._glossaryShow);
            el.removeEventListener("focus", el._glossaryShow);
            el.removeEventListener("mouseleave", hide);
            el.removeEventListener("blur", hide);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    matched.forEach((el) => {
      el.classList.add("glossary-term");
      el._glossaryShow = () => show(el);
      observer.observe(el);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   SESSION HTML CACHE
   ═══════════════════════════════════════════════════════════════ */
const _HTML_CACHE_PREFIX = "wiki-html-cache-";

function cacheRenderedHtml(filePath, html) {
  try {
    sessionStorage.setItem(_HTML_CACHE_PREFIX + filePath, html);
  } catch {}
}

function getCachedHtml(filePath) {
  try {
    return sessionStorage.getItem(_HTML_CACHE_PREFIX + filePath);
  } catch {
    return null;
  }
}

export {
  addInlineCaveats,
  addInlineGlossaryExpand,
  addGlossaryTerms,
  cacheRenderedHtml,
  getCachedHtml,
  resetGlossaryExpandTracking,
};
