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

  it("Shift+arrows switch variant and never step", () => {
    const step = vi.fn();
    const variant = vi.fn();
    function VariantHarness() {
      useVizHotkeys({ toggle: () => {}, step, variant });
      return null;
    }
    render(<VariantHarness />);
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(document.body, { key: "ArrowLeft", shiftKey: true });
    expect(variant.mock.calls).toEqual([[1], [-1]]);
    expect(step).not.toHaveBeenCalled();
  });

  it("ignores Shift+arrows in fields and with Ctrl, Meta or Alt held", () => {
    const variant = vi.fn();
    function VariantHarness() {
      useVizHotkeys({ toggle: () => {}, variant });
      return <input aria-label="Sequence" />;
    }
    const { getByLabelText } = render(<VariantHarness />);
    fireEvent.keyDown(getByLabelText("Sequence"), { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true, ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true, metaKey: true });
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true, altKey: true });
    expect(variant).not.toHaveBeenCalled();
  });

  it("does nothing when disabled and skips arrows when no step handler is given", () => {
    const toggle = vi.fn();
    function Disabled({ enabled }: { enabled: boolean }) {
      useVizHotkeys({ toggle, enabled });
      return null;
    }
    const { rerender } = render(<Disabled enabled={false} />);
    fireEvent.keyDown(document.body, { key: " " });
    expect(toggle).not.toHaveBeenCalled();
    rerender(<Disabled enabled />);
    fireEvent.keyDown(document.body, { key: " " });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(toggle).toHaveBeenCalledOnce();
  });
});
