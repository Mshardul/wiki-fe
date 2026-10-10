import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LanesModel } from "@/lib/visualizer/core/shapes";
import { LanesShape } from "./LanesShape";
import { Shape } from "./Shape";

const model: LanesModel = {
  kind: "lanes",
  lanes: [
    { id: "app", name: "App", sections: [] },
    {
      id: "cache",
      name: "Cache",
      dead: true,
      sections: [
        {
          title: "Entries",
          layout: "rows",
          items: [
            { text: "A = v2", tone: "stale", bar: { value: 2, max: 5 } },
            { text: "— wiped —", tone: "muted" },
          ],
        },
        { title: "Write buffer", layout: "chips", items: [{ text: "C = v2", tone: "lost" }] },
      ],
    },
    {
      id: "db",
      name: "DB",
      sections: [{ title: "Rows", layout: "rows", items: [{ text: "A = v1", tone: "changed" }] }],
    },
  ],
  hops: [
    { from: "app", to: "cache", label: "get A", thread: 0 },
    { from: "cache", to: "app", label: "v2 · stale", thread: 0, reply: true, flag: true },
    { from: "cache", to: "db", label: "flush A = v2", thread: 1 },
  ],
  slots: 3,
  cardRows: 7,
  note: "node down",
};

describe("LanesShape", () => {
  it("names the hops in order for screen readers", () => {
    render(<LanesShape model={model} subject="Cache" />);
    expect(
      screen.getByRole("img", {
        name: "Cache: App to Cache get A, Cache to App v2 · stale, Cache to DB flush A = v2",
      }),
    ).toBeTruthy();
  });

  it("falls back to a no-messages label when there are no hops", () => {
    render(<LanesShape model={{ ...model, hops: [] }} subject="Cache" />);
    expect(screen.getByRole("img", { name: "Cache: no messages" })).toBeTruthy();
  });

  it("draws a header per lane and marks the dead one", () => {
    const { container } = render(<LanesShape model={model} subject="Cache" />);
    expect(container.querySelectorAll(".viz-lanes__head")).toHaveLength(3);
    const dead = container.querySelectorAll(".viz-lanes__head.is-dead");
    expect(dead).toHaveLength(1);
    expect(dead[0]?.textContent).toBe("Cache ✕");
  });

  it("draws one numbered hop per message with thread, reply and flag classes", () => {
    const { container } = render(<LanesShape model={model} subject="Cache" />);
    expect(container.querySelectorAll(".viz-lanes__hop")).toHaveLength(3);
    expect(container.querySelectorAll(".viz-lanes__hop--t1")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-lanes__hop.is-reply")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-lanes__hop.is-flag")).toHaveLength(1);
    const nums = [...container.querySelectorAll(".viz-lanes__num")].map((n) => n.textContent);
    expect(nums).toEqual(["1", "2", "3"]);
  });

  it("tones card items, draws chips and an expiry bar", () => {
    const { container } = render(<LanesShape model={model} subject="Cache" />);
    expect(container.querySelector(".viz-lanes__item--stale")?.textContent).toBe("A = v2");
    expect(container.querySelector(".viz-lanes__item--changed")?.textContent).toBe("A = v1");
    expect(container.querySelector(".viz-lanes__chip--lost")).toBeTruthy();
    expect(container.querySelector(".viz-lanes__bar-fill")?.getAttribute("width")).toBe("17.6");
  });

  it("replays the fade-in when the step changes even if the hops look the same", () => {
    const { container, rerender } = render(
      <LanesShape model={{ ...model, epoch: 0 }} subject="Cache" />,
    );
    const first = container.querySelector(".viz-lanes__hop");
    rerender(<LanesShape model={{ ...model, epoch: 1 }} subject="Cache" />);
    const second = container.querySelector(".viz-lanes__hop");
    expect(second).not.toBe(first);
    rerender(<LanesShape model={{ ...model, epoch: 1 }} subject="Cache" />);
    expect(container.querySelector(".viz-lanes__hop")).toBe(second);
  });

  it("shows the note and the Shape router picks lanes", () => {
    const { container } = render(
      <Shape model={model} rotated={false} size={{ w: 800, h: 600 }} subject="Cache" />,
    );
    expect(container.querySelector(".viz-lanes")).toBeTruthy();
    expect(container.querySelector(".viz-lanes__note")?.textContent).toBe("node down");
  });
});
