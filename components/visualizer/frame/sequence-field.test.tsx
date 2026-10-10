import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SequenceField } from "@/lib/visualizer/core/fields";
import { ConfigField } from "./ConfigFields";

const field: SequenceField = {
  kind: "sequence",
  key: "sequence",
  label: "Sequence",
  param: "q",
  maxLen: 40,
  hint: "Type tokens, press Enter",
  resetBy: [],
  parse: (raw) =>
    raw.trim().toUpperCase() === "GO"
      ? { ok: true, tokens: ["GO"] }
      : { ok: false, error: "Only GO works" },
};

describe("sequence field with a module parser", () => {
  it("shows the parser's error and does not apply a rejected draft", () => {
    const onChange = vi.fn();
    render(<ConfigField field={field} value={null} sequence={["GO"]} onChange={onChange} />);
    const input = screen.getByLabelText("Sequence");
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Only GO works")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies the parsed tokens on Enter and clears the error on edit", () => {
    const onChange = vi.fn();
    render(<ConfigField field={field} value={null} sequence={["GO"]} onChange={onChange} />);
    const input = screen.getByLabelText("Sequence");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "go" } });
    expect(screen.getByText("Type tokens, press Enter")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["GO"]);
  });
});
