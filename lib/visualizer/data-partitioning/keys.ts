import type { SequenceParse } from "../core/fields";
import {
  type KeyItem,
  MAX_EVENTS,
  MAX_KEY,
  MAX_KEYS,
  MAX_NODES,
  MIN_NODES,
  NODE_LETTERS,
} from "./types";

export const KEYS_NUMBER_ERROR = "Keys must be whole numbers from 0 to 99";
export const KEYS_ONCE_ERROR = "Each key can appear once";
export const KEYS_COUNT_ERROR = "Use 1 to 12 keys";
export const KEYS_HOT_ERROR = "Only one key can be hot (*)";
export const EVENTS_TOKEN_ERROR = "Events are + or -X (X a node letter)";
export const EVENTS_COUNT_ERROR = "At most 4 events";
export const EVENTS_RANGE_ERROR = "Node count must stay between 1 and 6";

const KEY_TOKEN = /^(\d{1,2})(\*?)$/;
const SPLIT = /[\s,_]+/;

export function parseKeys(raw: string): SequenceParse {
  const parts = raw.split(SPLIT).filter((p) => p !== "");
  const found = parts.map((p) => KEY_TOKEN.exec(p));
  if (parts.length === 0) return { ok: false, error: KEYS_COUNT_ERROR };
  if (found.some((m) => m === null)) return { ok: false, error: KEYS_NUMBER_ERROR };
  const nums = found.map((m) => Number((m as RegExpExecArray)[1]));
  if (nums.some((n) => n > MAX_KEY)) return { ok: false, error: KEYS_NUMBER_ERROR };
  if (parts.length > MAX_KEYS) return { ok: false, error: KEYS_COUNT_ERROR };
  if (new Set(nums).size !== nums.length) return { ok: false, error: KEYS_ONCE_ERROR };
  if (found.filter((m) => (m as RegExpExecArray)[2] === "*").length > 1) {
    return { ok: false, error: KEYS_HOT_ERROR };
  }
  return { ok: true, tokens: parts };
}

export function toKeyItems(tokens: string[]): KeyItem[] {
  return tokens.flatMap((t): KeyItem[] => {
    const m = KEY_TOKEN.exec(t);
    return m ? [{ key: Number(m[1]), hot: m[2] === "*" }] : [];
  });
}

export const tokenOf = (item: KeyItem): string => `${item.key}${item.hot ? "*" : ""}`;

export interface ResolvedEvent {
  kind: "add" | "remove";
  letter: string;
}

type Resolved = { ok: true; events: ResolvedEvent[] } | { ok: false; error: string };

// Walks the events from the starting count: an add takes the next letter never used, a remove needs a live letter.
export function resolveEvents(start: number, tokens: string[]): Resolved {
  const alive = NODE_LETTERS.slice(0, start);
  let used = start;
  const events: ResolvedEvent[] = [];
  for (const raw of tokens) {
    const t = raw.replace("−", "-").toUpperCase();
    if (t === "+") {
      if (alive.length >= MAX_NODES) return { ok: false, error: EVENTS_RANGE_ERROR };
      const letter = NODE_LETTERS[used] as string;
      used += 1;
      alive.push(letter);
      events.push({ kind: "add", letter });
      continue;
    }
    const m = /^-([A-J])$/.exec(t);
    if (!m) return { ok: false, error: EVENTS_TOKEN_ERROR };
    const letter = m[1] as string;
    const at = alive.indexOf(letter);
    if (at === -1) {
      return { ok: false, error: `Can't remove ${letter}: it isn't there at that point` };
    }
    if (alive.length <= MIN_NODES) return { ok: false, error: EVENTS_RANGE_ERROR };
    alive.splice(at, 1);
    events.push({ kind: "remove", letter });
  }
  return { ok: true, events };
}

export function parseEvents(raw: string, start: number): SequenceParse {
  const parts = raw
    .replace(/−/g, "-")
    .split(SPLIT)
    .filter((p) => p !== "");
  if (parts.some((p) => p !== "+" && !/^-[A-Za-z]$/.test(p))) {
    return { ok: false, error: EVENTS_TOKEN_ERROR };
  }
  if (parts.length > MAX_EVENTS) return { ok: false, error: EVENTS_COUNT_ERROR };
  const tokens = parts.map((p) => p.toUpperCase());
  const resolved = resolveEvents(start, tokens);
  return resolved.ok ? { ok: true, tokens } : resolved;
}
