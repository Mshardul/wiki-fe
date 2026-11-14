import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { keyText } from "@/lib/visualizer/core/rich";
import { Stage } from "./Stage";

afterEach(() => vi.restoreAllMocks());

describe("Stage", () => {
  it("shows the corner metric, the picture and the caption in one block", () => {
    const { container } = render(
      <Stage metric="25%" metricLabel="Hit rate" caption={[keyText("hello")]}>
        {() => <div>shape</div>}
      </Stage>,
    );
    expect(container.querySelector(".viz-stage__metric")).not.toBeNull();
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText("Hit rate")).toBeTruthy();
    expect(container.querySelectorAll(".viz-stage")).toHaveLength(1);
    expect(container.querySelector(".viz-stage__main, .viz-stage__aside")).toBeNull();
  });

  it("draws the caption last, after the picture", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 300,
    } as DOMRect);
    const { container } = render(
      <Stage metric="" metricLabel="" caption={[keyText("hello")]}>
        {() => <div data-testid="shape">shape</div>}
      </Stage>,
    );
    const stage = container.querySelector(".viz-stage") as HTMLElement;
    const caption = container.querySelector(".viz-stage__caption") as HTMLElement;
    expect(screen.getByTestId("shape").parentElement).toBe(stage);
    expect(stage.lastElementChild).toBe(caption);
  });

  it("passes the measured stage size to the picture", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 640,
      height: 360,
    } as DOMRect);
    const seen: { w: number; h: number }[] = [];
    render(
      <Stage metric="" metricLabel="" caption={[]}>
        {(size) => {
          seen.push(size);
          return <div>shape</div>;
        }}
      </Stage>,
    );
    expect(seen.at(-1)).toEqual({ w: 640, h: 360 });
  });
});
