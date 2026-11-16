import { badText, goodText, keyText, type Rich } from "../core/rich";
import type { FlowCard, FlowCardsModel, FlowChip, FlowPanel } from "../core/shapes";
import type { VarRow } from "../core/types";
import {
  addressOf,
  clientOf,
  type Flight,
  type LbInput,
  type LbStep,
  LONG_AT,
  type Pick,
  WEIGHTS,
} from "./types";

const dash = "–";
const serverName = (s: number): string => `S${s + 1}`;
const reqName = (r: number): string => `r${r}`;
const plural = (n: number): string => (n === 1 ? "connection" : "connections");

export interface Ctx {
  input: LbInput;
  slots: number;
}

export function makeCtx(input: LbInput, steps: LbStep[]): Ctx {
  let slots = 1;
  for (const s of steps) {
    for (let srv = 0; srv < input.servers; srv++) {
      const here = s.flights.filter((f) => f.server === srv).length;
      const ghost = s.arriving?.server === srv ? 1 : 0;
      slots = Math.max(slots, here + ghost);
    }
  }
  return { input, slots };
}

const countsOf = (s: LbStep, servers: number): number[] =>
  Array.from({ length: servers }, (_, i) => s.flights.filter((f) => f.server === i).length);

function chipOf(f: Flight, tick: number, ghost: boolean): FlowChip {
  return {
    id: reqName(f.request),
    label: reqName(f.request),
    left: f.end - tick,
    total: f.total,
    heavy: f.total >= LONG_AT,
    ghost,
  };
}

function cardsOf(ctx: Ctx, s: LbStep): FlowCard[] {
  const counts = countsOf(s, ctx.input.servers);
  return Array.from({ length: ctx.input.servers }, (_, i) => {
    const chips = s.flights.filter((f) => f.server === i).map((f) => chipOf(f, s.tick, false));
    if (s.arriving && s.arriving.server === i) chips.push(chipOf(s.arriving, s.tick, true));
    const up = s.up[i] as boolean;
    return {
      id: serverName(i),
      label: serverName(i),
      hue: i,
      count: up ? String(counts[i]) : dash,
      countLabel: up ? plural(counts[i] as number) : "down",
      ...(ctx.input.policy === "weighted" ? { badge: `w${WEIGHTS[i]}` } : {}),
      chips,
      ...(up ? {} : { down: true }),
    };
  });
}

function panelOf(ctx: Ctx, s: LbStep): FlowPanel {
  const n = ctx.input.servers;
  const pick = s.pick;
  const names = Array.from({ length: n }, (_, i) => serverName(i));
  const target = pick ? serverName(pick.server) : null;
  const who = s.request === null ? "the request" : reqName(s.request);
  switch (ctx.input.policy) {
    case "round-robin": {
      const turn = pick?.server ?? nextTurn(s);
      return {
        title: "whose turn",
        body: {
          kind: "tokens",
          items: names.map((label, i) => ({ label, on: i === turn, muted: !s.up[i] })),
        },
        headline: {
          label: "picks by",
          value: "turn only",
          note: target ? `It is ${target}'s turn, so ${who} goes there.` : "Load is not looked at.",
        },
      };
    }
    case "weighted": {
      const credits = pick?.kind === "credits" ? pick.credits : s.state.credits;
      return {
        title: "credits left",
        body: {
          kind: "bars",
          rows: names.map((label, i) => ({
            label,
            value: credits[i] as number,
            of: WEIGHTS[i] as number,
            note: `${credits[i]} of ${WEIGHTS[i]}`,
            mark: pick?.server === i,
            muted: !s.up[i],
          })),
        },
        headline: {
          label: "picks by",
          value: "turn × weight",
          note:
            pick?.kind === "credits" && pick.refilled
              ? `Every credit was spent, so all refill. ${target} goes first.`
              : target
                ? `${target} still has credits, so ${who} goes there.`
                : "A server takes its weight in requests, then the turn moves on.",
        },
      };
    }
    case "least-connections": {
      const counts = pick?.kind === "counts" ? pick.counts : countsOf(s, n);
      const top = Math.max(1, ...counts);
      return {
        title: "connections now",
        body: {
          kind: "bars",
          rows: names.map((label, i) => ({
            label,
            value: counts[i] as number,
            of: top,
            note: `${counts[i]}${pick?.server === i ? " · lowest" : ""}`,
            mark: pick?.server === i,
            muted: !s.up[i],
          })),
        },
        headline: {
          label: "picks by",
          value: "fewest connections",
          note: target
            ? `${target} has the fewest, so ${who} goes there.`
            : "The server with the fewest connections gets the next request.",
        },
      };
    }
    case "ip-hash": {
      const alive = s.up.filter(Boolean).length;
      const lines =
        pick?.kind === "hash"
          ? [
              `client ${addressOf(pick.client)}`,
              `${pick.client} mod ${pick.alive.length} = ${pick.remainder}`,
              `→ ${target}`,
            ]
          : [`${alive} servers up`, "address mod server count", "picks the server"];
      return {
        title: "hash of the client",
        body: { kind: "lines", lines },
        headline: {
          label: "picks by",
          value: "client address",
          note: "The same client always reaches the same server.",
        },
      };
    }
  }
}

function nextTurn(s: LbStep): number {
  const n = s.up.length;
  for (let k = 0; k < n; k++) {
    const i = (s.state.next + k) % n;
    if (s.up[i]) return i;
  }
  return 0;
}

export function modelOf(ctx: Ctx, s: LbStep): FlowCardsModel {
  const reroute = s.phase === "decide" && s.from !== null;
  const showIntake = s.phase === "decide" && s.from === null && s.arriving !== null;
  const routing = s.phase === "decide" || s.phase === "land";
  return {
    kind: "flow-cards",
    hub: "load balancer",
    intake:
      showIntake && s.arriving
        ? {
            label: reqName(s.arriving.request),
            note: `${s.arriving.total} ticks`,
            caption:
              ctx.input.policy === "ip-hash"
                ? `from ${addressOf(clientOf(s.arriving.request))}`
                : "next request",
          }
        : null,
    cards: cardsOf(ctx, s),
    slots: ctx.slots,
    routeTo: routing && s.server !== null ? serverName(s.server) : null,
    moves:
      reroute && s.from !== null && s.server !== null
        ? [{ from: serverName(s.from), to: serverName(s.server) }]
        : [],
    panel: panelOf(ctx, s),
  };
}

function why(ctx: Ctx, pick: Pick): Rich {
  switch (pick.kind) {
    case "turn":
      return [`it is `, keyText(serverName(pick.server)), `'s turn`];
    case "credits":
      return pick.refilled
        ? ["every credit was spent, so all refill; ", keyText(serverName(pick.server)), " is first"]
        : [keyText(serverName(pick.server)), ` has ${pick.credits[pick.server]} credits left`];
    case "counts": {
      const c = pick.counts[pick.server] as number;
      return [keyText(serverName(pick.server)), ` has the fewest connections (${c})`];
    }
    case "hash":
      return [
        `${pick.client} mod ${pick.alive.length} = ${pick.remainder}`,
        ctx.input.servers === pick.alive.length ? "" : ` (${pick.alive.length} servers up)`,
      ];
  }
}

export function captionOf(ctx: Ctx, s: LbStep): Rich {
  const srv = s.server === null ? "" : serverName(s.server);
  const req = s.request === null ? "" : reqName(s.request);
  if (s.phase === "fail") {
    const stranded = s.flights.filter((f) => f.server === s.server).length;
    return [
      badText(srv),
      stranded === 0
        ? " goes down; nothing was running on it."
        : ` goes down; its ${stranded} running ${stranded === 1 ? "request" : "requests"} must move.`,
    ];
  }
  if (s.phase === "finish") {
    const left = countsOf(s, ctx.input.servers)[s.server as number] as number;
    return [goodText(req), " finishes on ", keyText(srv), `; it holds ${left} now.`];
  }
  if (s.phase === "land") {
    const held = countsOf(s, ctx.input.servers)[s.server as number] as number;
    return [keyText(req), " joins ", keyText(srv), `; it holds ${held}.`];
  }
  const head: Rich =
    s.from === null
      ? [keyText(req), ` (${s.arriving?.total} ticks): `]
      : [keyText(req), ` leaves the down ${serverName(s.from)}: `];
  const reason = s.pick ? why(ctx, s.pick) : [];
  return [...head, ...reason, " → ", keyText(srv), "."];
}

export function labelOf(s: LbStep): string {
  const srv = s.server === null ? "" : serverName(s.server);
  const req = s.request === null ? "" : reqName(s.request);
  if (s.phase === "fail") return `${srv} down`;
  if (s.phase === "finish") return `${req} done`;
  if (s.phase === "land") return `${req} lands`;
  return `${req} → ${srv}`;
}

const joined = (names: string[], values: (number | string)[]): string =>
  names.map((n, i) => `${n} ${values[i]}`).join(" · ");

export function varsOf(ctx: Ctx, s: LbStep): VarRow[] {
  const n = ctx.input.servers;
  const names = Array.from({ length: n }, (_, i) => serverName(i));
  const counts = countsOf(s, n);
  const rows: VarRow[] = [
    { name: "Tick", value: String(s.tick) },
    {
      name: "Request",
      value:
        s.request === null
          ? dash
          : s.arriving
            ? `${reqName(s.request)} (${s.arriving.total} ticks)`
            : reqName(s.request),
    },
    { name: "Server", value: s.server === null ? dash : serverName(s.server) },
    {
      name: "Connections",
      value: joined(
        names,
        counts.map((c, i) => (s.up[i] ? c : dash)),
      ),
    },
  ];
  const pick = s.pick;
  switch (ctx.input.policy) {
    case "round-robin":
      rows.push({ name: "Next turn", value: serverName(pick?.server ?? nextTurn(s)) });
      break;
    case "weighted":
      rows.push({ name: "Credits", value: joined(names, s.state.credits) });
      break;
    case "least-connections":
      rows.push({
        name: "Fewest",
        value:
          pick?.kind === "counts" ? `${serverName(pick.server)} (${counts[pick.server]})` : dash,
      });
      break;
    case "ip-hash":
      rows.push({
        name: "Hash",
        value:
          pick?.kind === "hash"
            ? `${pick.client} mod ${pick.alive.length} = ${pick.remainder}`
            : dash,
      });
      break;
  }
  return rows;
}

export const metricOf = (ctx: Ctx, s: LbStep): string =>
  String(Math.max(0, ...countsOf(s, ctx.input.servers)));
