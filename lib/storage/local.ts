type KeyListener = () => void;

const listeners = new Map<string, Set<KeyListener>>();
let storageBound = false;

export function getString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode / quota — the local layer is best-effort
  }
  notify(key);
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  notify(key);
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = getString(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  setString(key, JSON.stringify(value));
}

// Referentially-stable snapshot reader for useSyncExternalStore: returns the same reference
// until the stored string for `key` changes.
export function makeSnapshot<T>(key: string, fallback: T): () => T {
  let cachedRaw: string | null = null;
  let cachedValue: T = fallback;
  return () => {
    const raw = getString(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue =
        raw == null
          ? fallback
          : ((): T => {
              try {
                return JSON.parse(raw) as T;
              } catch {
                return fallback;
              }
            })();
    }
    return cachedValue;
  };
}

// Fires on a same-tab write through this module AND on a cross-tab `storage` event for `key`.
export function subscribeKey(key: string, cb: KeyListener): () => void {
  bindStorage();
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);
  return () => set.delete(cb);
}

function notify(key: string): void {
  for (const cb of listeners.get(key) ?? []) cb();
}

function bindStorage(): void {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (e) => {
    if (e.key == null) return;
    for (const cb of listeners.get(e.key) ?? []) cb();
  });
}
