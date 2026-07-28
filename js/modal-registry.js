/* ═══════════════════════════════════════════════════════════════
   MODAL REGISTRY
   Shared focus-trap + open-state tracking so each modal controller
   doesn't reimplement identical Tab-cycle and isOpen() logic.
   ═══════════════════════════════════════════════════════════════ */

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

// Shared default focusable-element query - reused directly by callers whose
// dialog element is resolved dynamically (e.g. re-queried per keypress).
function getFocusableIn(containerEl) {
  const focusable = containerEl.querySelectorAll(
    "button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), a[href]",
  );
  return Array.from(focusable).filter((el) => el.offsetParent !== null);
}

const _modals = [];

// Registers a modal's { isOpen, close } so shared consumers (Escape chain,
// isAnyModalOpen) can route through one list instead of naming each modal.
function registerModal(entry) {
  _modals.push(entry);
}

function isAnyModalOpen() {
  return _modals.some((m) => m.isOpen());
}

// Closes the topmost open modal (registration order); returns true if one closed.
function closeTopModal() {
  for (const m of _modals) {
    if (m.isOpen()) {
      m.close();
      return true;
    }
  }
  return false;
}

export { createFocusTrap, getFocusableIn, registerModal, isAnyModalOpen, closeTopModal };
