export type MigrateChoice = "keep" | "discard";

type OpenFn = (resolve: (choice: MigrateChoice) => void) => void;
let opener: OpenFn | null = null;
let pending = false;

export function registerMigrateModal(fn: OpenFn): () => void {
  opener = fn;
  return () => {
    if (opener === fn) opener = null;
  };
}

// Resolves with the user's choice. Caller decides what to do with it.
export function openMigrateModal(): Promise<MigrateChoice> {
  pending = true;
  return new Promise<MigrateChoice>((resolve) => {
    opener?.(resolve);
  });
}

// While a migrate decision is pending the auth modal underneath must stay open —
// Escape/backdrop on it would drop the "Logging in…" shell mid-flow.
export function isMigratePending(): boolean {
  return pending;
}

export function _setMigratePending(v: boolean): void {
  pending = v;
}
