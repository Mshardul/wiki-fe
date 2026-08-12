/* MODAL REGISTRY — Shared focus-trap + open-state tracking so each modal controller — doesn't reimplement identical Tab-cycle and isOpen() logic. */

// Cycles Tab focus between the first/last focusable element inside `dialogEl`.
// Returns a handler to pass to addEventListener/removeEventListener("keydown", ...).
function createFocusTrap(dialogEl, getFocusable) {
  return (e) => {
    if (e.key !== "Tab") return;
    const els = getFocusable ? getFocusable() : getFocusableIn(dialogEl);
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}

// Shared default focusable-element query, reused by callers whose dialog element is resolved dynamically (e.g. re-queried per keypress).
function getFocusableIn(containerEl) {
  const focusable = containerEl.querySelectorAll(
    "button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), a[href]",
  );
  return Array.from(focusable).filter((el) => el.offsetParent !== null);
}

const _modals = [];
const _openStack = [];

// Registers a modal's { isOpen, close } so shared consumers (Escape chain, isAnyModalOpen) route through one list instead of naming each modal.
function registerModal(entry) {
  _modals.push(entry);
}

function markModalOpened(entry) {
  const idx = _openStack.indexOf(entry);
  if (idx >= 0) _openStack.splice(idx, 1);
  _openStack.push(entry);
}

function markModalClosed(entry) {
  const idx = _openStack.indexOf(entry);
  if (idx >= 0) _openStack.splice(idx, 1);
}

function isAnyModalOpen() {
  return _modals.some((m) => m.isOpen());
}

// Closes the most recently opened registered modal; returns true if one closed.
function closeTopModal() {
  for (let i = _openStack.length - 1; i >= 0; i--) {
    const m = _openStack[i];
    if (m.isOpen()) {
      m.close();
      return true;
    }
  }
  for (const m of _modals) {
    if (m.isOpen()) {
      m.close();
      return true;
    }
  }
  return false;
}

export {
  createFocusTrap,
  getFocusableIn,
  registerModal,
  markModalOpened,
  markModalClosed,
  isAnyModalOpen,
  closeTopModal,
};
