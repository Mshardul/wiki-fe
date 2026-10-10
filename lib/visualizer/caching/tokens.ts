import type { SequenceParse } from "../core/fields";
import { KEYS, type Op, type OpKind } from "./types";

export const SEQUENCE_ERROR = "Use R, W or X plus a key A–E, or !";
export const MAX_REQUESTS = 40;

const KINDS = "RWX";

export function parseCachingSequence(raw: string): SequenceParse {
  const text = raw.toUpperCase().replace(/[\s,]/g, "");
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text.charAt(i);
    if (c === "!") {
      tokens.push("!");
      i += 1;
      continue;
    }
    const k = text.charAt(i + 1);
    if (KINDS.includes(c) && k !== "" && KEYS.includes(k)) {
      tokens.push(c + k);
      i += 2;
      continue;
    }
    return { ok: false, error: SEQUENCE_ERROR };
  }
  if (tokens.length === 0) return { ok: false, error: SEQUENCE_ERROR };
  return { ok: true, tokens: tokens.slice(0, MAX_REQUESTS) };
}

export function opsOf(tokens: string[]): Op[] {
  return tokens.map((t): Op => {
    if (t === "!") return { kind: "!", key: "" };
    return { kind: t.charAt(0) as OpKind, key: t.charAt(1) };
  });
}
