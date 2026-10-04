import { ApiError, api } from "@/lib/api";
import { verticalRegistry } from "@/lib/content/verticals";
import { clearBookmarksLocal, pullBookmarks } from "./bookmarks";
import { clearCompletions, pullCompletions } from "./completions";
import {
  appendToOutbox,
  clearOutbox,
  type Mutation,
  type OutboxEntry,
  readOutbox,
  reconcileOwners,
  removeFromOutbox,
} from "./outbox";
import { clearRecentsLocal, pullRecents } from "./recents";
import { getSession } from "./session";

// Cache-through orchestrator: local is the instant read path + UI source of truth; the API is the durable store.
// Writes land in a persisted outbox first and are replayed in order, so a failed or offline write is retried instead of lost.

const RETRY_DELAYS_MS = [5_000, 15_000, 60_000];
const FLUSH_LOCK = "wiki-outbox-flush";

let flushing: Promise<boolean> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

// Anonymous writes are local-only (login imports them); writes during boot are queued unowned until the session resolves.
export function enqueueSync(mutation: Mutation): void {
  const { status, user } = getSession();
  if (status === "out") return;
  appendToOutbox(mutation, user?.id ?? null, new Date().toISOString());
  if (status === "in") void flushOutbox();
}

function send(e: OutboxEntry): Promise<unknown> {
  switch (e.kind) {
    case "bookmark.add":
      return api.bookmarks.add(e.wikiId, e.path, e.clientTs);
    case "bookmark.remove":
      return api.bookmarks.remove(e.wikiId, e.path, e.clientTs);
    case "bookmark.clear":
      return api.bookmarks.clear(e.wikiId);
    case "completion.add":
      return api.completions.add(e.wikiId, e.path, e.clientTs);
    case "completion.remove":
      return api.completions.remove(e.wikiId, e.path, e.clientTs);
    case "recent.add":
      return api.recents.add(e.wikiId, e.path, e.clientTs);
    case "recent.clear":
      return api.recents.clear(e.wikiId);
  }
}

type Verdict = "retry" | "stop" | "drop";

// Anything that is not an ApiError is a bug, so it propagates instead of being retried forever.
function classify(err: unknown): Verdict {
  if (!(err instanceof ApiError)) throw err;
  if (err.status === 401) return "stop";
  const transient = err.status === 0 || err.status === 408 || err.status === 429;
  return transient || err.status >= 500 ? "retry" : "drop";
}

function cancelRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryAttempt = 0;
}

function scheduleRetry(): void {
  if (retryTimer) return;
  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)] ?? 0;
  retryAttempt++;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, delay);
}

async function drain(): Promise<boolean> {
  const { status, user } = getSession();
  if (status !== "in" || !user) return false;
  reconcileOwners(user.id);
  for (;;) {
    const entry = readOutbox()[0];
    if (!entry) {
      retryAttempt = 0;
      return true;
    }
    try {
      await send(entry);
      removeFromOutbox(entry.id);
    } catch (err) {
      const verdict = classify(err);
      if (verdict === "drop") {
        removeFromOutbox(entry.id);
        continue;
      }
      if (verdict === "retry") scheduleRetry();
      return false;
    }
  }
}

async function drainExclusive(): Promise<boolean> {
  if (!("locks" in navigator)) return drain();
  return (await navigator.locks.request(FLUSH_LOCK, drain)) as boolean;
}

// One flush at a time, across tabs where Web Locks exist. Resolves true only once nothing is left to send.
export function flushOutbox(): Promise<boolean> {
  flushing ??= (async () => {
    try {
      let drained: boolean;
      // A write queued while the last drain was returning would otherwise be stranded until the next trigger.
      do drained = await drainExclusive();
      while (drained && readOutbox().length > 0);
      return drained;
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

// Pull all server lists into local, overwriting local with server truth. Run on login + boot.
// Skipped while writes are still pending: a pull would overwrite them with stale server state.
export async function pullAll(): Promise<void> {
  if (!(await flushOutbox())) return;
  await Promise.allSettled([pullBookmarks(), pullRecents(), pullCompletions()]);
}

// Wipes the local mirror only; never enqueues a server-side clear.
export function clearUserDataCache(): void {
  cancelRetry();
  clearOutbox();
  clearBookmarksLocal();
  clearRecentsLocal();
  for (const v of verticalRegistry()) clearCompletions(v.id);
}
