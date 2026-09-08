import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IconTooltip } from "./IconTooltip";

function btn() {
  const b = document.createElement("button");
  b.className = "topbar-icon-btn";
  b.setAttribute("title", "Search");
  document.body.appendChild(b);
  return b;
}

describe("IconTooltip", () => {
  it("shows after the delay on hover and strips the native title while visible", () => {
    vi.useFakeTimers();
    render(<IconTooltip />);
    const b = btn();
    fireEvent.mouseOver(b);
    vi.advanceTimersByTime(350);
    const tip = document.getElementById("icon-tooltip");
    expect(tip?.classList.contains("visible")).toBe(true);
    expect(tip?.textContent).toBe("Search");
    expect(b.hasAttribute("title")).toBe(false);
    vi.useRealTimers();
  });

  it("restores the native title on mouseout", () => {
    vi.useFakeTimers();
    render(<IconTooltip />);
    const b = btn();
    fireEvent.mouseOver(b);
    vi.advanceTimersByTime(350);
    fireEvent.mouseOut(b, { relatedTarget: document.body });
    expect(b.getAttribute("title")).toBe("Search");
    expect(document.getElementById("icon-tooltip")?.classList.contains("visible")).toBe(false);
    vi.useRealTimers();
  });

  it("shows immediately on focus without stripping the title", () => {
    render(<IconTooltip />);
    const b = btn();
    fireEvent.focusIn(b);
    expect(document.getElementById("icon-tooltip")?.classList.contains("visible")).toBe(true);
    expect(b.getAttribute("title")).toBe("Search");
  });
});
