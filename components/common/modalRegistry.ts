export interface ModalEntry {
  isOpen: () => boolean;
  close: () => void;
}

const registered: ModalEntry[] = [];
const openStack: ModalEntry[] = [];

export function registerModal(entry: ModalEntry): () => void {
  registered.push(entry);
  return () => {
    remove(registered, entry);
    remove(openStack, entry);
  };
}

export function markOpened(entry: ModalEntry): void {
  remove(openStack, entry);
  openStack.push(entry);
}

export function markClosed(entry: ModalEntry): void {
  remove(openStack, entry);
}

export function anyOpen(): boolean {
  return registered.some((m) => m.isOpen());
}

// Most-recently-opened first; falls back to registration order if the stack has no still-open entry.
export function closeTopmost(): boolean {
  for (let i = openStack.length - 1; i >= 0; i--) {
    const m = openStack[i];
    if (m?.isOpen()) {
      m.close();
      return true;
    }
  }
  for (const m of registered) {
    if (m.isOpen()) {
      m.close();
      return true;
    }
  }
  return false;
}

function remove(arr: ModalEntry[], entry: ModalEntry): void {
  const i = arr.indexOf(entry);
  if (i >= 0) arr.splice(i, 1);
}
