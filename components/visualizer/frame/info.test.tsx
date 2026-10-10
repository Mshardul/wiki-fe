import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { evictionModule } from "@/lib/visualizer/eviction/module";
import { lru } from "@/lib/visualizer/eviction/policies/lru";
import { simulate } from "@/lib/visualizer/eviction/simulate";
import { InfoPanel } from "./InfoPanel";
import { StepLines } from "./InfoTabs";

const RUN = evictionModule.run({
  ...evictionModule.defaults(),
  sequence: "ABCADEAFBAGC".split(""),
});

interface Handlers {
  onSeek?: (i: number) => void;
  onTry?: (e: unknown) => void;
}

const renderPanel = (frame: number, sub: number, extra: Handlers = {}) =>
  render(
    <InfoPanel
      info={RUN.info}
      frames={RUN.frames}
      frame={frame}
      sub={sub}
      unit="request"
      onSeek={extra.onSeek ?? vi.fn()}
      onTry={extra.onTry ?? vi.fn()}
    />,
  );

describe("InfoPanel", () => {
  it("shows the policy summary on top", () => {
    renderPanel(7, 0);
    expect(screen.getByRole("heading", { name: "LRU" })).toBeTruthy();
    expect(screen.getByText("Stack")).toBeTruthy();
    expect(screen.getByText("Throw out whatever was used longest ago.")).toBeTruthy();
  });

  it("Step tab: current line, lines already run, and the branch not taken", () => {
    const { container } = renderPanel(7, 1);
    const lines = [...container.querySelectorAll(".viz-steps__line")];
    expect(lines.map((l) => l.className.replace("viz-steps__line viz-steps__line--", ""))).toEqual([
      "ran",
      "skip",
      "now",
      "todo",
    ]);
    expect(lines[2]?.textContent).toBe("No → miss. Full → remove C from the bottom.");
    expect(screen.getByRole("row", { name: /removed/ }).textContent).toContain("C");
  });

  it("Step tab: each line is one grid cell, so keys and text never split across rows", () => {
    const { container } = renderPanel(7, 1);
    for (const line of container.querySelectorAll(".viz-steps__line")) {
      expect(line.children).toHaveLength(1);
    }
  });

  it("Log tab lists requests so far and seeks on click", () => {
    const onSeek = vi.fn();
    renderPanel(7, 0, { onSeek });
    fireEvent.click(screen.getByRole("tab", { name: "Log" }));
    const rows = screen.getAllByRole("button", { name: /^#\d+/ });
    expect(rows).toHaveLength(8);
    expect(rows[7]?.textContent).toContain("removed C");
    const fourth = rows[3];
    if (!fourth) throw new Error("missing row");
    fireEvent.click(fourth);
    expect(onSeek).toHaveBeenCalledWith(3);
  });

  it("About and Try tabs; Try runs an experiment", () => {
    const onTry = vi.fn();
    renderPanel(7, 0, { onTry });
    fireEvent.click(screen.getByRole("tab", { name: "About" }));
    expect(screen.getByText("O(1) per request — hashmap + doubly linked list")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Try" }));
    const run = screen.getAllByRole("button", { name: /Run/ })[0];
    if (!run) throw new Error("missing Run button");
    fireEvent.click(run);
    expect(onTry).toHaveBeenCalledWith(RUN.info.tries[0]);
  });

  it("keeps the chosen tab while playback moves on", () => {
    const { rerender } = renderPanel(7, 0);
    fireEvent.click(screen.getByRole("tab", { name: "About" }));
    rerender(
      <InfoPanel
        info={RUN.info}
        frames={RUN.frames}
        frame={8}
        sub={0}
        unit="request"
        onSeek={vi.fn()}
        onTry={vi.fn()}
      />,
    );
    expect(screen.getByRole("tab", { name: "About" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("StepLines", () => {
  const frames = simulate(lru, 4, "ABCADEAFBAGC".split(""));
  const hit = frames.find((f) => f.badge === "HIT");
  const miss = frames.find((f) => f.badge === "MISS");

  it("marks the line for the current sub-step", () => {
    if (!hit) throw new Error("fixture needs a hit frame");
    const { container } = render(<StepLines frame={hit} sub={1} unit="request" />);
    expect(container.querySelectorAll(".viz-steps__line--now")).toHaveLength(1);
  });

  it("a short path holds its last line when sub runs past it", () => {
    if (!hit || !miss) throw new Error("fixture needs a hit and a miss frame");
    expect(hit.path.length).toBeLessThan(miss.path.length);
    const { container } = render(
      <StepLines frame={hit} sub={miss.path.length - 1} unit="request" />,
    );
    expect(container.querySelectorAll(".viz-steps__line--now")).toHaveLength(1);
  });
});
