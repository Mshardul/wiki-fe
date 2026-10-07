import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVizHotkeys } from "./useVizHotkeys";

function Harness({ toggle, step }: { toggle: () => void; step: (d: number) => void }) {
  useVizHotkeys({ toggle, step });
  return (
    <div>
      <input aria-label="Sequence" />
      <button type="button">Play</button>
    </div>
  );
}

describe("useVizHotkeys", () => {
  it("Space toggles, arrows step", () => {
    const toggle = vi.fn();
    const step = vi.fn();
    render(<Harness toggle={toggle} step={step} />);
    fireEvent.keyDown(document.body, { key: " " });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(toggle).toHaveBeenCalledOnce();
    expect(step.mock.calls).toEqual([[1], [-1]]);
  });

  it("ignores keys while typing in a field", () => {
    const toggle = vi.fn();
    const step = vi.fn();
    const { getByLabelText } = render(<Harness toggle={toggle} step={step} />);
    fireEvent.keyDown(getByLabelText("Sequence"), { key: " " });
    fireEvent.keyDown(getByLabelText("Sequence"), { key: "ArrowRight" });
    expect(toggle).not.toHaveBeenCalled();
    expect(step).not.toHaveBeenCalled();
  });

  it("leaves Space to a focused button so playback doesn't toggle twice", () => {
    const toggle = vi.fn();
    const { getByRole } = render(<Harness toggle={toggle} step={vi.fn()} />);
    fireEvent.keyDown(getByRole("button", { name: "Play" }), { key: " " });
    expect(toggle).not.toHaveBeenCalled();
  });

  it("ignores keys with modifiers", () => {
    const step = vi.fn();
    render(<Harness toggle={vi.fn()} step={step} />);
    fireEvent.keyDown(document.body, { key: "ArrowRight", metaKey: true });
    expect(step).not.toHaveBeenCalled();
  });
});
