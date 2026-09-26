let count = 0;

// Ref-counted; nested modals must not unlock the body on the first close.
export function lockBodyScroll(): void {
  count++;
  document.body.classList.add("modal-open");
}

export function unlockBodyScroll(): void {
  count = Math.max(0, count - 1);
  if (count === 0) document.body.classList.remove("modal-open");
}
