import { clampInt, type InputValues, type SequenceParse } from "../core/fields";
import { DEFAULT_DURATIONS, EVEN_DURATIONS } from "./copy";
import {
  DEFAULT_SERVERS,
  type LbInput,
  MAX_REQUESTS,
  MAX_SERVERS,
  MAX_TICKS,
  MIN_REQUESTS,
  MIN_SERVERS,
  POLICY_IDS,
  WORKLOADS,
  type Workload,
} from "./types";

export const DURATIONS_ERROR = `Use ${MIN_REQUESTS} to ${MAX_REQUESTS} numbers from 1 to ${MAX_TICKS}`;

// Every duration is one digit, so separators are optional.
export function parseDurations(raw: string): SequenceParse {
  const text = raw.replace(/[\s,_]+/g, "");
  const ok = /^[1-9]+$/.test(text) && text.length >= MIN_REQUESTS && text.length <= MAX_REQUESTS;
  return ok ? { ok: true, tokens: text.split("") } : { ok: false, error: DURATIONS_ERROR };
}

const workloadOf = (v: unknown): Workload => WORKLOADS.find((w) => w === v) ?? "uneven";

export const durationsFor = (workload: Workload): string[] =>
  workload === "even" ? EVEN_DURATIONS : DEFAULT_DURATIONS;

function tokensOf(values: InputValues): string[] {
  const given = Array.isArray(values.durations) ? values.durations : null;
  if (given && parseDurations(given.join("")).ok) return given;
  return durationsFor(workloadOf(values.workload));
}

export function toLbInput(values: InputValues): LbInput & { tokens: string[] } {
  const policy = POLICY_IDS.find((p) => p === values.policy) ?? "round-robin";
  const servers = clampInt(
    typeof values.servers === "number" ? values.servers : DEFAULT_SERVERS,
    MIN_SERVERS,
    MAX_SERVERS,
  );
  const tokens = tokensOf(values);
  const picked = Number(values.failure);
  // "none" and a server that does not exist both mean no failure.
  const failure = Number.isInteger(picked) && picked >= 1 && picked <= servers ? picked - 1 : null;
  return { policy, servers, durations: tokens.map(Number), failure, tokens };
}
