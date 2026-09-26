import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerModal } from "@/components/common/modalRegistry";
import { ViewportHandler } from "./ViewportHandler";

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
  document.body.innerHTML = `<div id="hover-preview" class="hover-preview visible"></div>`;
  document.body.className = "toc-open";
});
afterEach(() => vi.useRealTimers());

describe("ViewportHandler", () => {
  it("on a significant width change: dispatches diagram-relayout and clears the hover preview", () => {
    const relayout = vi.fn();
    document.addEventListener("wiki:diagram-relayout", relayout);
    render(<ViewportHandler />);

    Object.defineProperty(window, "innerWidth", { value: 900, configurable: true });
    fireEvent(window, new Event("resize"));
    vi.advanceTimersByTime(200);

    expect(relayout).toHaveBeenCalled();
    expect(document.getElementById("hover-preview")?.classList.contains("visible")).toBe(false);
    document.removeEventListener("wiki:diagram-relayout", relayout);
  });

  it("ignores a tiny width change", () => {
    const relayout = vi.fn();
    document.addEventListener("wiki:diagram-relayout", relayout);
    render(<ViewportHandler />);
    Object.defineProperty(window, "innerWidth", { value: 410, configurable: true });
    fireEvent(window, new Event("resize"));
    vi.advanceTimersByTime(200);
    expect(relayout).not.toHaveBeenCalled();
    document.removeEventListener("wiki:diagram-relayout", relayout);
  });

  it("closes any open modal on a significant width change, not just TOC", () => {
    document.body.className = "";
    const close = vi.fn();
    const unregister = registerModal({ isOpen: () => true, close });
    render(<ViewportHandler />);

    Object.defineProperty(window, "innerWidth", { value: 900, configurable: true });
    fireEvent(window, new Event("resize"));
    vi.advanceTimersByTime(200);

    expect(close).toHaveBeenCalled();
    unregister();
  });

  it("does not close a modal opened mid-debounce, after the resize started", () => {
    document.body.className = "";
    render(<ViewportHandler />);
    Object.defineProperty(window, "innerWidth", { value: 900, configurable: true });
    fireEvent(window, new Event("resize"));

    const close = vi.fn();
    const unregister = registerModal({ isOpen: () => true, close });
    vi.advanceTimersByTime(200);

    expect(close).not.toHaveBeenCalled();
    unregister();
  });
});
