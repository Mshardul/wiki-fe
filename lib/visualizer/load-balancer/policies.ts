import { clientOf, type Pick, type PolicyId, type PolicyState, WEIGHTS } from "./types";

export interface PickContext {
  request: number;
  up: boolean[];
  counts: number[];
  state: PolicyState;
}

export interface Decision {
  pick: Pick;
  state: PolicyState;
}

export const initialState = (servers: number): PolicyState => ({
  next: 0,
  credits: WEIGHTS.slice(0, servers),
});

const aliveIndexes = (up: boolean[]): number[] => up.flatMap((u, i) => (u ? [i] : []));

// First live server at or after `from`, wrapping round; a server that fails `ok` is skipped.
function scan(up: boolean[], from: number, ok: (i: number) => boolean = () => true): number | null {
  const n = up.length;
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (up[i] && ok(i)) return i;
  }
  return null;
}

function roundRobin(ctx: PickContext): Decision {
  const server = scan(ctx.up, ctx.state.next) as number;
  return {
    pick: { kind: "turn", server },
    state: { ...ctx.state, next: (server + 1) % ctx.up.length },
  };
}

// A server takes as many requests as its weight before the turn moves on.
function weighted(ctx: PickContext): Decision {
  const firstWithCredits = (have: number[]): number | null =>
    scan(ctx.up, ctx.state.next, (i) => (have[i] as number) > 0);
  const refilled = firstWithCredits(ctx.state.credits) === null;
  const credits = refilled ? WEIGHTS.slice(0, ctx.up.length) : ctx.state.credits;
  const server = firstWithCredits(credits) as number;
  const left = credits.map((c, i) => (i === server ? c - 1 : c));
  return {
    pick: { kind: "credits", server, credits, refilled },
    state: {
      next: (left[server] as number) > 0 ? server : (server + 1) % ctx.up.length,
      credits: left,
    },
  };
}

function leastConnections(ctx: PickContext): Decision {
  let server = scan(ctx.up, 0) as number;
  ctx.counts.forEach((c, i) => {
    if (ctx.up[i] && c < (ctx.counts[server] as number)) server = i;
  });
  return { pick: { kind: "counts", server, counts: ctx.counts }, state: ctx.state };
}

// The client's address picks the server, so the same client always lands on the same one.
function ipHash(ctx: PickContext): Decision {
  const client = clientOf(ctx.request);
  const alive = aliveIndexes(ctx.up);
  const remainder = client % alive.length;
  return {
    pick: { kind: "hash", server: alive[remainder] as number, client, alive, remainder },
    state: ctx.state,
  };
}

const POLICIES: Record<PolicyId, (ctx: PickContext) => Decision> = {
  "round-robin": roundRobin,
  weighted,
  "least-connections": leastConnections,
  "ip-hash": ipHash,
};

export const decide = (policy: PolicyId, ctx: PickContext): Decision => POLICIES[policy](ctx);
