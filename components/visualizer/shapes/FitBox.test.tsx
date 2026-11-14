import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FitBox } from "./FitBox";

function layout(view: { w: number; h: number }, natural: { w: number; h: number }) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: view.w,
    height: view.h,
  } as DOMRect);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(natural.w);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(natural.h);
}

const scaleOf = (el: Element | null) =>
  Number(/scale\(([\d.]+)\)/.exec((el as HTMLElement).style.transform)?.[1]);

afterEach(() => vi.restoreAllMocks());

describe("FitBox", () => {
  it("shrinks the drawing to fit a smaller stage, keeping the aspect ratio", () => {
    layout({ w: 200, h: 400 }, { w: 400, h: 100 });
    const { container } = render(<FitBox className="x">content</FitBox>);
    expect(scaleOf(container.querySelector(".viz-fit__inner"))).toBe(0.5);
  });

  it("grows the drawing when the stage is bigger, up to the cap", () => {
    layout({ w: 600, h: 600 }, { w: 400, h: 100 });
    const { container } = render(<FitBox className="x">content</FitBox>);
    expect(scaleOf(container.querySelector(".viz-fit__inner"))).toBe(1.5);
    vi.restoreAllMocks();
    layout({ w: 5000, h: 5000 }, { w: 400, h: 100 });
    const big = render(<FitBox className="x">content</FitBox>);
    expect(scaleOf(big.container.querySelector(".viz-fit__inner"))).toBe(2);
  });

  it("draws at scale 1 until it is measured", () => {
    const { container } = render(<FitBox className="x">content</FitBox>);
    expect(scaleOf(container.querySelector(".viz-fit__inner"))).toBe(1);
  });
});
