import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useElementSize } from "./useElementSize";

function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  return (
    <div ref={ref} data-testid="box">
      {size.w}x{size.h}
    </div>
  );
}

describe("useElementSize", () => {
  it("reports the measured size", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 640,
      height: 360,
    } as DOMRect);
    const { getByTestId } = render(<Harness />);
    expect(getByTestId("box").textContent).toBe("640x360");
    vi.restoreAllMocks();
  });
});
