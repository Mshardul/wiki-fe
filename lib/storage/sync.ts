import { verticalRegistry } from "@/lib/content/verticals";
import { clearBookmarks, pullBookmarks } from "./bookmarks";
import { clearCompletions, pullCompletions } from "./completions";
import { clearRecents, pullRecents } from "./recents";
import { getSession } from "./session";

// Cache-through orchestrator. Ported from js/state.js scheduleSyncMutation +
// js/storage/settings-theme.js Sync. Local is the instant read path + UI source of truth;
// the API is the durable store; writes are fire-and-forget.

const queues = new Map<string, Promise<unknown>>();

// Serialise writes that share a key (e.g. add-then-remove the same bookmark) so they land in order.
function sequenced(key: string, fn: () => Promise<unknown>): Promise<unknown> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn).finally(() => {
    if (queues.get(key) === next) queues.delete(key);
  });
  queues.set(key, next);
  return next;
}

// Writes made while the session is still "loading" (boot) must not be lost by pullAll() — queue them.
const bootQueue: Array<() => Promise<unknown>> = [];

export function scheduleSyncMutation(key: string, fn: () => Promise<unknown>): void {
  const status = getSession().status;
  if (status === "in") {
    sequenced(key, fn).catch(() => {
      // fire-and-forget — a failed sync never surfaces to the UI
    });
  } else if (status === "loading") {
    bootQueue.push(() => sequenced(key, fn));
  }
  // status "out": local-only, nothing to sync
}

export async function flushBootMutations(): Promise<void> {
  const q = bootQueue.splice(0);
  if (q.length) await Promise.allSettled(q.map((run) => run()));
}

export function discardBootMutations(): void {
  bootQueue.length = 0;
}

// Pull all server lists into local, overwriting local with server truth. Run on login + boot.
export async function pullAll(): Promise<void> {
  await Promise.allSettled([pullBookmarks(), pullRecents(), pullCompletions()]);
}

// Logout: drop every synced local cache.
export function clearUserDataCache(): void {
  clearBookmarks();
  clearRecents();
  for (const v of verticalRegistry()) clearCompletions(v.id);
}
