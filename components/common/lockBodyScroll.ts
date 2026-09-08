let count = 0;

// Ref-counted body scroll lock; mirrors the .modal-open class as js/state.js did.
export function lockBodyScroll(): void {
  count++;
  document.body.classList.add("modal-open");
}

export function unlockBodyScroll(): void {
  count = Math.max(0, count - 1);
  if (count === 0) document.body.classList.remove("modal-open");
}
