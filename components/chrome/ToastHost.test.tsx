import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetToasts, showToast } from "@/lib/toast";
import { ToastHost } from "./ToastHost";

describe("ToastHost", () => {
  beforeEach(() => {
    _resetToasts();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("renders the current toast with faithful class names", () => {
    render(<ToastHost />);
    act(() => showToast("saved", { variant: "success" }));
    const el = screen.getByRole("status");
    expect(el.id).toBe("wiki-toast");
    expect(el.className).toContain("wiki-toast--success");
    expect(screen.getByText("saved").className).toBe("wiki-toast-msg");
  });

  it("shows an undo button that fires the callback", () => {
    const undo = vi.fn();
    render(<ToastHost />);
    act(() => showToast("removed", { onUndo: undo }));
    act(() => screen.getByRole("button").click());
    expect(undo).toHaveBeenCalledOnce();
  });
});
