import { describe, expect, it } from "vitest";
import { MINIS, neighboursOf, normalise, PRESET_IDS, PRESETS } from "./graphs";
import { graphOf, small } from "./test-helpers";

const names = (g: ReturnType<typeof neighboursOf>) => g.map((n) => n.node);

describe("normalise", () => {
  it("drops a duplicate undirected edge written both ways", () => {
    const g = graphOf("AB", [
      ["A", "B"],
      ["B", "A"],
      ["A", "B"],
    ]);
    expect(normalise(g).edges).toHaveLength(1);
  });

  it("keeps the lower weight of duplicates", () => {
    const g = graphOf("AB", [
      ["A", "B", 5],
      ["B", "A", 3],
    ]);
    expect(normalise(g).edges).toEqual([{ from: "A", to: "B", weight: 3 }]);
  });

  it("keeps both arrows of a directed pair", () => {
    const g = graphOf(
      "AB",
      [
        ["A", "B"],
        ["B", "A"],
      ],
      true,
    );
    expect(normalise(g).edges).toHaveLength(2);
  });

  it("keeps a self-loop", () => {
    const g = graphOf("A", [["A", "A"]]);
    expect(normalise(g).edges).toHaveLength(1);
  });
});

describe("neighboursOf", () => {
  it("is declaration order at seed 0", () => {
    expect(names(neighboursOf(small, "G", 0))).toEqual(["E", "F", "H"]);
    const dag = PRESETS.dag.data;
    expect(names(neighboursOf(dag, "B", 0))).toEqual(["C", "D"]);
    expect(names(neighboursOf(dag, "E", 0))).toEqual(["F"]);
  });

  it("shuffles the same set deterministically for another seed", () => {
    const a = names(neighboursOf(small, "G", 7));
    const b = names(neighboursOf(small, "G", 7));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(["E", "F", "H"]);
  });

  it("lists a self-loop once", () => {
    expect(names(neighboursOf(graphOf("A", [["A", "A"]]), "A", 0))).toEqual(["A"]);
  });

  it("uses a weight of 1 when none is given", () => {
    expect(neighboursOf(small, "H", 0)).toEqual([{ node: "G", weight: 1 }]);
  });
});

type Seg = [number, number, number, number];
const cross = (p: Seg, q: Seg): boolean => {
  const d = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const [a, b, c, e] = p;
  const [f, g, h, i] = q;
  return (
    d(a, b, c, e, f, g) * d(a, b, c, e, h, i) < 0 && d(f, g, h, i, a, b) * d(f, g, h, i, c, e) < 0
  );
};

describe("presets", () => {
  const all = [...PRESET_IDS.map((id) => PRESETS[id]), ...Object.values(MINIS)];

  it("have a coordinate for every node and valid edge ends", () => {
    for (const p of all) {
      for (const n of p.data.nodes) expect(p.coords[n]).toBeDefined();
      for (const e of p.data.edges) {
        expect(p.data.nodes).toContain(e.from);
        expect(p.data.nodes).toContain(e.to);
      }
    }
  });

  it("keep nodes at least 0.9 cell apart", () => {
    for (const p of all) {
      const pts = p.data.nodes.map((n) => p.coords[n] as { x: number; y: number });
      pts.forEach((a, i) => {
        for (const b of pts.slice(i + 1))
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.9);
      });
    }
  });

  it("have no crossing edges", () => {
    for (const p of all) {
      const segs = p.data.edges.map((e): [string, string, Seg] => {
        const a = p.coords[e.from] as { x: number; y: number };
        const b = p.coords[e.to] as { x: number; y: number };
        return [e.from, e.to, [a.x, a.y, b.x, b.y]];
      });
      segs.forEach((s, i) => {
        for (const t of segs.slice(i + 1)) {
          if (s[0] === t[0] || s[0] === t[1] || s[1] === t[0] || s[1] === t[1]) continue;
          expect(cross(s[2], t[2])).toBe(false);
        }
      });
    }
  });
});
