const TOOLTIP_SELECTOR = ".topbar-icon-btn";
const SHOW_DELAY_MS = 300;

let _tooltipEl = null;
let _showTimer = null;
let _pendingBtn = null;

function _tooltip() {
  if (!_tooltipEl) {
    _tooltipEl = document.createElement("div");
    _tooltipEl.id = "icon-tooltip";
    _tooltipEl.setAttribute("role", "tooltip");
    document.body.appendChild(_tooltipEl);
  }
  return _tooltipEl;
}

function _position(btn) {
  const tooltip = _tooltip();
  const rect = btn.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.bottom + 6}px`;
}

function _show(btn, { stripTitle = true } = {}) {
  const label = btn.dataset.tooltipLabel || btn.getAttribute("title");
  if (!label) return;
  btn.dataset.tooltipLabel = label;
  // Hover only: native title is hover-driven; stripping on focus breaks re-clicks by title.
  if (stripTitle) btn.removeAttribute("title");
  const tooltip = _tooltip();
  tooltip.textContent = label;
  _position(btn);
  tooltip.classList.add("visible");
}

// Restores the native title (a11y/no-JS fallback) and hides the custom tooltip, if any. Runs on every leave regardless of whether the tooltip actually became visible - the title must never stay stripped past a mouseover that didn't reach the show delay.
function _release(btn) {
  clearTimeout(_showTimer);
  _tooltipEl?.classList.remove("visible");
  if (btn?.dataset.tooltipLabel) {
    btn.setAttribute("title", btn.dataset.tooltipLabel);
    delete btn.dataset.tooltipLabel;
  }
  _pendingBtn = null;
}

function _arm(btn) {
  if (!btn || btn === _pendingBtn) return;
  const title = btn.getAttribute("title");
  if (title) btn.dataset.tooltipLabel = title;
  else if (!btn.dataset.tooltipLabel) return;
  _pendingBtn = btn;
  clearTimeout(_showTimer);
  _showTimer = setTimeout(() => _show(btn), SHOW_DELAY_MS);
}

function initIconTooltips() {
  document.body.addEventListener("mouseover", (e) => {
    _arm(e.target.closest(TOOLTIP_SELECTOR));
  });

  document.body.addEventListener("mouseout", (e) => {
    const btn = e.target.closest(TOOLTIP_SELECTOR);
    if (!btn || btn.contains(e.relatedTarget)) return;
    _release(btn);
  });

  // Restore title on click so a later title-based open still matches.
  document.body.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(TOOLTIP_SELECTOR);
      if (btn) _release(btn);
    },
    true,
  );

  document.body.addEventListener(
    "focusin",
    (e) => {
      const btn = e.target.closest(TOOLTIP_SELECTOR);
      if (!btn) return;
      const title = btn.getAttribute("title");
      if (title) btn.dataset.tooltipLabel = title;
      else if (!btn.dataset.tooltipLabel) return;
      _pendingBtn = btn;
      clearTimeout(_showTimer);
      _show(btn, { stripTitle: false });
    },
    true,
  );

  document.body.addEventListener(
    "focusout",
    (e) => {
      const btn = e.target.closest(TOOLTIP_SELECTOR);
      if (btn) _release(btn);
    },
    true,
  );
}

export { initIconTooltips };
