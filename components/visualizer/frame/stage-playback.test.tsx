import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { badText, keyText } from "@/lib/visualizer/core/rich";
import { lru } from "@/lib/visualizer/eviction/policies/lru";
import { simulate } from "@/lib/visualizer/eviction/simulate";
import { PlaybackBar } from "./PlaybackBar";
import { Stage } from "./Stage";
import { TimelineStrip } from "./TimelineStrip";

const FRAMES = simulate(lru, 4, "ABCADEAFBAGC".split(""));

describe("Stage", () => {
  it("shows the metric and caption", () => {
    render(
      <Stage metric="25%" metricLabel="Hit rate" caption={[keyText("F"), " ", badText("miss")]}>
        {() => <div>shape</div>}
      </Stage>,
    );
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText("Hit rate")).toBeTruthy();
    expect(screen.getByText("miss")).toBeTruthy();
  });

  it("draws children once measured", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 500,
      height: 400,
    } as DOMRect);
    render(
      <Stage metric="0%" metricLabel="Hit rate" caption={[]}>
        {(size) => <div>{`${size.w}x${size.h}`}</div>}
      </Stage>,
    );
    expect(screen.getByText("500x400")).toBeTruthy();
    vi.restoreAllMocks();
  });
});

describe("PlaybackBar", () => {
  const baseProps = () => ({
    frame: 2,
    total: 12,
    unit: "request",
    playing: true,
    speed: 1 as const,
    repeat: "off" as const,
    rotate: null,
    onSeek: vi.fn(),
    onStep: vi.fn(),
    onToggle: vi.fn(),
    onSpeed: vi.fn(),
    onRepeat: vi.fn(),
  });

  it("counter, play/pause label and control callbacks", () => {
    const props = baseProps();
    render(<PlaybackBar {...props} />);
    expect(screen.getByText("request 3 / 12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "First request" }));
    fireEvent.click(screen.getByRole("button", { name: "Last request" }));
    fireEvent.click(screen.getByRole("button", { name: "Next request" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous request" }));
    fireEvent.click(screen.getByRole("button", { name: "2×" }));
    expect(props.onToggle).toHaveBeenCalledOnce();
    expect(props.onSeek.mock.calls).toEqual([[0], [11]]);
    expect(props.onStep.mock.calls).toEqual([[1], [-1]]);
    expect(props.onSpeed).toHaveBeenCalledWith(2);
  });

  it("repeat is an icon-only button whose label names the current mode", () => {
    const props = baseProps();
    const { rerender } = render(<PlaybackBar {...props} />);
    const btn = screen.getByRole("button", { name: "Repeat: off" });
    expect(btn.textContent).toBe("");
    expect(btn.querySelector("use")?.getAttribute("href")).toBe("#icon-repeat-off");
    fireEvent.click(btn);
    expect(props.onRepeat).toHaveBeenCalledOnce();
    rerender(<PlaybackBar {...props} repeat="once" />);
    expect(
      screen
        .getByRole("button", { name: "Repeat: once" })
        .querySelector("use")
        ?.getAttribute("href"),
    ).toBe("#icon-repeat-once");
    rerender(<PlaybackBar {...props} repeat="infinite" />);
    expect(
      screen
        .getByRole("button", { name: "Repeat: forever" })
        .querySelector("use")
        ?.getAttribute("href"),
    ).toBe("#icon-repeat");
  });

  it("rotate is an icon-only toggle, labelled by state, and absent for axis-less shapes", () => {
    const onToggle = vi.fn();
    const props = baseProps();
    const { rerender } = render(<PlaybackBar {...props} />);
    expect(screen.queryByRole("button", { name: /Rotate|default/ })).toBeNull();
    rerender(
      <PlaybackBar {...props} rotate={{ rotated: false, defaultName: "stack", onToggle }} />,
    );
    const btn = screen.getByRole("button", { name: "Rotate view" });
    expect(btn.textContent).toBe("");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(<PlaybackBar {...props} rotate={{ rotated: true, defaultName: "stack", onToggle }} />);
    expect(
      screen
        .getByRole("button", { name: "Back to the default stack view" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
});

describe("TimelineStrip", () => {
  it("colours played cells by outcome, marks the current one, and seeks on click", () => {
    const onSeek = vi.fn();
    render(<TimelineStrip frames={FRAMES} current={7} unit="request" onSeek={onSeek} />);
    expect(screen.getByRole("button", { name: "Request 4: A, hit" }).className).toContain(
      "is-good",
    );
    expect(screen.getByRole("button", { name: "Request 1: A, miss" }).className).toContain(
      "is-bad",
    );
    const current = screen.getByRole("button", { name: "Request 8: F" });
    expect(current.getAttribute("aria-current")).toBe("step");
    expect(current.className).toContain("is-current");
    expect(screen.getByRole("button", { name: "Request 9: B" }).className).toBe("viz-strip__cell");
    fireEvent.click(screen.getByRole("button", { name: "Request 2: B, miss" }));
    expect(onSeek).toHaveBeenCalledWith(1);
  });
});
