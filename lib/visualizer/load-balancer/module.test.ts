import { describe, expect, it } from "vitest";
import { richText } from "../core/rich";
import type { FlowCardsModel } from "../core/shapes";
import { COPY, DEFAULT_DURATIONS } from "./copy";
import { BALANCER_SECTIONS, balancerModule } from "./module";
import { POLICY_IDS, type PolicyId } from "./types";

const result = (v: object) => balancerModule.run({ ...balancerModule.defaults(), ...v });
const flow = (m: unknown): FlowCardsModel => m as FlowCardsModel;

describe("balancer module", () => {
  it("has the route's slug, a chip per variant in difficulty order and a Revision card each", () => {
    expect(balancerModule.slug).toBe("load-balancer-algorithms");
    expect(balancerModule.variants).toEqual({ key: "policy" });
    const chips = BALANCER_SECTIONS[0]?.fields[0];
    expect(chips?.kind === "chips" && chips.options.map((o) => o.value)).toEqual([...POLICY_IDS]);
    expect(balancerModule.revision).toHaveLength(4);
  });

  it("opens on 3 servers, uneven requests and no failure, under every variant", () => {
    expect(balancerModule.defaults()).toMatchObject({
      policy: "round-robin",
      servers: 3,
      failure: "none",
      durations: DEFAULT_DURATIONS,
    });
    for (const policy of POLICY_IDS) {
      const r = result({ policy });
      // 7 requests: a decide, a land and a finish each.
      expect(r.frames, policy).toHaveLength(21);
      expect(r.sequences).toEqual({ durations: DEFAULT_DURATIONS });
      expect(r.metricLabel).toBe("Most connections");
    }
  });

  it("every variant has the same frame count when nothing fails, so switching keeps the step", () => {
    for (const v of [{ servers: 2 }, { servers: 4 }, { durations: ["3", "3"] }]) {
      const counts = POLICY_IDS.map((policy) => result({ policy, ...v }).frames.length);
      expect(new Set(counts).size, JSON.stringify(v)).toBe(1);
    }
  });

  it("a failure adds a Down step plus a decide and a land for each request that has to move", () => {
    const plain = result({}).frames.length;
    // S1 holds r1 and r4 when it fails before r5: 1 + 2 * 2 extra steps, and no finish is lost.
    expect(result({ failure: "1" }).frames).toHaveLength(plain + 5);
  });

  it("a failure on a server that does not exist is ignored", () => {
    expect(result({ servers: 2, failure: "4" }).frames).toHaveLength(
      result({ servers: 2 }).frames.length,
    );
  });

  it("every variant carries its article link, rule, about rows and two experiments", () => {
    for (const policy of POLICY_IDS) {
      const info = result({ policy }).info;
      expect(info.articleHref).toMatch(/^\/system-design\/components\/load-balancer-algorithms\//);
      expect(info.rule.length).toBeGreaterThan(0);
      expect(info.about.length).toBe(4);
      expect(info.tries).toHaveLength(2);
    }
  });

  it("every experiment patches inputs the module reads and keeps its step count sensible", () => {
    for (const policy of POLICY_IDS) {
      for (const t of COPY[policy].tries) {
        const r = result({ policy, ...t.patch });
        expect(r.frames.length, t.title).toBeGreaterThan(0);
      }
    }
  });

  it("round robin, r7 decide: the turn token sits on S1 and the route goes to S1", () => {
    const frame = result({}).frames.find((f) => f.label === "r7 → S1");
    const m = flow(frame?.model);
    expect(m.routeTo).toBe("S1");
    expect(m.intake).toMatchObject({ label: "r7", note: "8 ticks", caption: "next request" });
    expect(m.panel.body).toMatchObject({ kind: "tokens" });
    expect(m.cards[0]?.chips.map((c) => [c.label, c.left, c.total, c.ghost])).toEqual([
      ["r1", 3, 9, false],
      ["r4", 3, 6, false],
      ["r7", 8, 8, true],
    ]);
    expect(m.cards.map((c) => c.count)).toEqual(["2", "0", "1"]);
  });

  it("least connections, r7 decide: the panel compares counts and marks the lowest", () => {
    const frame = result({ policy: "least-connections" }).frames.find((f) => f.label === "r7 → S3");
    const m = flow(frame?.model);
    expect(m.routeTo).toBe("S3");
    expect(m.panel.headline.value).toBe("fewest connections");
    expect(m.panel.body.kind === "bars" && m.panel.body.rows.map((r) => r.note)).toEqual([
      "2",
      "1",
      "0 · lowest",
    ]);
  });

  it("ip hash shows the client address on the intake and the hash maths in the panel", () => {
    const frame = result({ policy: "ip-hash" }).frames.find((f) => f.label === "r4 → S1");
    const m = flow(frame?.model);
    expect(m.intake?.caption).toBe("from 10.0.0.9");
    expect(m.panel.body).toEqual({
      kind: "lines",
      lines: ["client 10.0.0.9", "9 mod 3 = 0", "→ S1"],
    });
  });

  it("weighted round robin shows the weights on the cards and credits in the panel", () => {
    const frame = result({ policy: "weighted" }).frames[0];
    const m = flow(frame?.model);
    expect(m.cards.map((c) => c.badge)).toEqual(["w3", "w2", "w1"]);
    expect(m.panel.body.kind === "bars" && m.panel.body.rows.map((r) => r.note)).toEqual([
      "3 of 3",
      "2 of 2",
      "1 of 1",
    ]);
  });

  it("a failed server is hatched and the re-route draws a dotted move to the new server", () => {
    const frames = result({ failure: "1" }).frames;
    const down = frames.find((f) => f.badge === "Down");
    expect(flow(down?.model).cards[0]).toMatchObject({ down: true, countLabel: "down" });
    const move = frames.find((f) => f.badge === "Re-route");
    const m = flow(move?.model);
    expect(m.moves).toEqual([{ from: "S1", to: "S2" }]);
    expect(m.intake).toBeNull();
    expect(richText(move?.caption ?? [])).toBe("r1 leaves the down S1: it is S2's turn → S2.");
  });

  it("the card widths stay fixed over a run: slots is the most chips on one card", () => {
    const slots = new Set(result({}).frames.map((f) => flow(f.model).slots));
    expect(slots.size).toBe(1);
    expect([...slots][0]).toBe(3);
  });

  it("every frame's step lines and path agree", () => {
    for (const policy of POLICY_IDS as readonly PolicyId[]) {
      for (const f of result({ policy, failure: "1" }).frames) {
        expect(f.lines).toHaveLength(5);
        expect(f.path.every((i) => i >= 0 && i < f.lines.length)).toBe(true);
      }
    }
  });

  it("junk input falls back to defaults instead of throwing", () => {
    const r = result({ policy: "nope", servers: 99, durations: ["x"], failure: "zzz" });
    expect(r.frames.length).toBeGreaterThan(0);
    expect(r.info.name).toBe("Round robin");
  });
});
