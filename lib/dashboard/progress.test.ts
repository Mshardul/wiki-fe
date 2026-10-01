import { describe, expect, it } from "vitest";
import type { VerticalIndex } from "@/lib/content/types";
import {
  assemblePathBars,
  assembleSectionBars,
  assembleWikiOverview,
  progressCounts,
} from "./progress";

const INDEX: VerticalIndex = {
  id: "system-design",
  sections: [
    {
      heading: "Components",
      articles: [
        {
          title: "Message Queues",
          slug: ["components", "message-queues"],
          path: "content/system-design/components/message-queues.md",
          isStub: false,
        },
        {
          title: "DNS",
          slug: ["components", "dns"],
          path: "content/system-design/components/dns.md",
          isStub: false,
        },
      ],
    },
    {
      heading: "Empty",
      articles: [],
    },
  ],
  learningPaths: [
    {
      track: "Components Foundation",
      rows: [
        { title: "Message Queues", slug: ["components", "message-queues"] },
        { title: "DNS", slug: ["components", "dns"] },
        { title: "Broken", slug: null },
      ],
    },
  ],
};

describe("progressCounts", () => {
  it("rounds 3 of 4 to 75%", () => {
    expect(progressCounts(3, 4)).toEqual({ completed: 3, total: 4, pct: 75 });
  });

  it("returns 0% when total is 0", () => {
    expect(progressCounts(0, 0).pct).toBe(0);
  });
});

describe("assembleWikiOverview", () => {
  it("counts completed articles across sections", () => {
    const completed = new Set(["content/system-design/components/message-queues.md"]);
    expect(assembleWikiOverview(INDEX, completed)).toEqual({
      completed: 1,
      total: 2,
      pct: 50,
    });
  });
});

describe("assembleSectionBars", () => {
  it("builds per-section bars and a Learning Paths drill-down", () => {
    const completed = new Set(["content/system-design/components/dns.md"]);
    const bars = assembleSectionBars(INDEX, "system-design", completed);
    expect(bars.map((b) => b.label)).toEqual(["Components", "Learning Paths"]);
    expect(bars[0]!.counts).toEqual({ completed: 1, total: 2, pct: 50 });
    expect(bars[1]!.href).toBe("/dashboard/system-design/paths/");
    expect(bars[1]!.counts).toEqual({ completed: 1, total: 2, pct: 50 });
  });
});

describe("assemblePathBars", () => {
  it("builds per-track bars from resolvable rows", () => {
    const completed = new Set([
      "content/system-design/components/message-queues.md",
      "content/system-design/components/dns.md",
    ]);
    const bars = assemblePathBars(INDEX, "system-design", completed);
    expect(bars).toEqual([
      { label: "Components Foundation", counts: { completed: 2, total: 2, pct: 100 } },
    ]);
  });
});
