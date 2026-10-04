import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { isCompleted, markCompleted } from "@/lib/storage/completions";
import { _resetToasts } from "@/lib/toast";
import { CompleteButton } from "./CompleteButton";

const PATH = "content/dsa/x.md";

beforeEach(() => {
  localStorage.clear();
  _resetToasts();
});

describe("CompleteButton", () => {
  it("starts unpressed and toggles completion on click", () => {
    render(<CompleteButton wikiId="dsa" path={PATH} />);
    const btn = screen.getByRole("button", { name: "Mark as completed" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(btn);
    expect(isCompleted("dsa", PATH)).toBe(true);
    expect(btn.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(btn);
    expect(isCompleted("dsa", PATH)).toBe(false);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("reflects existing completion on mount", () => {
    markCompleted("dsa", PATH);
    render(<CompleteButton wikiId="dsa" path={PATH} />);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("updates when completion changes elsewhere", () => {
    render(<CompleteButton wikiId="dsa" path={PATH} />);
    act(() => {
      markCompleted("dsa", PATH);
    });
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });
});
