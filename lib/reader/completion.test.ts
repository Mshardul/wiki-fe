import { beforeEach, describe, expect, it, vi } from "vitest";

const { showToast } = vi.hoisted(() => ({
  showToast: vi.fn<(message: string, opts?: { onUndo?: () => void }) => void>(),
}));
vi.mock("@/lib/toast", () => ({ showToast }));

import { isCompleted } from "@/lib/storage/completions";
import { toggleCompletion } from "./completion";

const PATH = "content/dsa/x.md";

beforeEach(() => {
  localStorage.clear();
  showToast.mockClear();
});

describe("toggleCompletion", () => {
  it("completes, toasts with an undo that reverts", () => {
    expect(toggleCompletion("dsa", PATH)).toBe(true);
    expect(isCompleted("dsa", PATH)).toBe(true);
    expect(showToast).toHaveBeenCalledWith(
      "Marked as completed",
      expect.objectContaining({ variant: "success" }),
    );

    showToast.mock.calls[0]?.[1]?.onUndo?.();
    expect(isCompleted("dsa", PATH)).toBe(false);
  });

  it("uncompletes on the second call without an undo", () => {
    toggleCompletion("dsa", PATH);
    showToast.mockClear();

    expect(toggleCompletion("dsa", PATH)).toBe(false);
    expect(isCompleted("dsa", PATH)).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Marked as not completed");
  });
});
