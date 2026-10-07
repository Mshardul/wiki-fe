import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FOLLOW_IDLE_MS, useFollowScroll } from "./useFollowScroll";

function Harness({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { recenterNow } = useFollowScroll(ref, index);
  return (
    <>
      <div ref={ref} data-testid="wrap">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} data-index={i}>
            {i}
          </span>
        ))}
      </div>
      <button type="button" onClick={recenterNow}>
        recenter
      </button>
    </>
  );
}

const scrollTo = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  scrollTo.mockClear();
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get(this: HTMLElement) {
      return Number(this.dataset.index ?? 0) * 100;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 40,
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 300,
  });
  Element.prototype.scrollTo = scrollTo;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useFollowScroll", () => {
  it("centres the current cell, and follows index changes", () => {
    const { rerender } = render(<Harness index={2} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 70, behavior: "smooth" });
    rerender(<Harness index={3} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 170, behavior: "smooth" });
  });

  it("uses instant scroll when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    render(<Harness index={2} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 70, behavior: "auto" });
  });

  it("pauses while the user scrolls, then glides back after the idle time", () => {
    const { getByTestId, rerender } = render(<Harness index={1} />);
    fireEvent.wheel(getByTestId("wrap"));
    scrollTo.mockClear();
    rerender(<Harness index={4} />);
    expect(scrollTo).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FOLLOW_IDLE_MS + 300);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 270, behavior: "smooth" });
  });

  it("recenterNow cancels the pause immediately", () => {
    const { getByTestId, getByRole, rerender } = render(<Harness index={1} />);
    fireEvent.pointerDown(getByTestId("wrap"));
    scrollTo.mockClear();
    fireEvent.click(getByRole("button", { name: "recenter" }));
    rerender(<Harness index={2} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 70, behavior: "smooth" });
  });
});
