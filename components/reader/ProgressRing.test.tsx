import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressRing } from "./ProgressRing";

describe("ProgressRing", () => {
  it("reflects scroll fraction as the bar width", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    document.documentElement.scrollTop = 0;
    render(<ProgressRing />);
    const bar = document.getElementById("reading-progress") as HTMLElement;
    fireEvent.scroll(window);
    expect(bar.style.width).toBe("0%");

    document.documentElement.scrollTop = 1000;
    fireEvent.scroll(window);
    expect(bar.style.width).toBe("100%");
  });
});
