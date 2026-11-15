import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FieldSection } from "@/lib/visualizer/core/fields";
import type { VizFrame } from "@/lib/visualizer/core/types";
import { ConfigPanel } from "./ConfigPanel";
import { TimelineStrip } from "./TimelineStrip";

const sections: FieldSection[] = [
  {
    title: "Nodes",
    fields: [
      { kind: "action", key: "add", label: "Add node", apply: (v) => ({ values: v }) },
      {
        kind: "chips",
        key: "vnodes",
        label: "Virtual nodes",
        param: "v",
        options: [
          { value: "1", label: "1" },
          { value: "4", label: "4" },
        ],
      },
      {
        kind: "sequence",
        key: "events",
        label: "Events",
        param: "e",
        maxLen: 4,
        hint: "",
        resetBy: [],
      },
      {
        kind: "sequence",
        key: "keys",
        label: "Keys",
        param: "k",
        maxLen: 4,
        hint: "",
        resetBy: [],
      },
    ],
  },
];
const values = { vnodes: "4", events: null, keys: null };

describe("action field", () => {
  it("calls onAction with its key", () => {
    const onAction = vi.fn();
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={[]}
        onChange={() => {}}
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    expect(onAction).toHaveBeenCalledWith("add");
  });

  it("disables with a hint from availability", () => {
    const onAction = vi.fn();
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={[]}
        onChange={() => {}}
        onAction={onAction}
        availability={{ add: { disabled: true, hint: "Six nodes is the most." } }}
      />,
    );
    const button = screen.getByRole("button", { name: "Add node" });
    expect(button).toHaveProperty("disabled", true);
    expect(screen.getByText("Six nodes is the most.")).toBeTruthy();
    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
  });
});

describe("disabled chips", () => {
  it("disables every chip of a group and keeps the hint", () => {
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={[]}
        onChange={() => {}}
        availability={{ vnodes: { disabled: true, hint: "Ring only." } }}
      />,
    );
    expect(screen.getByRole("button", { name: "4" })).toHaveProperty("disabled", true);
    expect(screen.getByText("Ring only.")).toBeTruthy();
  });
});

describe("per-field sequences", () => {
  it("shows each sequence field its own tokens", () => {
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={["X"]}
        sequences={{ events: ["+", "-B"], keys: ["12", "18"] }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("Events").value).toBe("+ -B");
    expect(screen.getByLabelText<HTMLInputElement>("Keys").value).toBe("12 18");
  });

  it("falls back to the shared sequence for a field without its own", () => {
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={["X"]}
        sequences={{ keys: ["12"] }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("Events").value).toBe("X");
  });
});

describe("neutral outcome", () => {
  const frame = (index: number, outcome: VizFrame["outcome"]): VizFrame => ({
    index,
    label: `L${index}`,
    outcome,
    badge: "Place",
    caption: [],
    lines: [],
    path: [],
    vars: [],
    logNote: [],
    metric: "",
    model: { kind: "table", rows: [] } as unknown as VizFrame["model"],
  });

  it("draws a played neutral cell with its own class", () => {
    const frames = [frame(0, "neutral"), frame(1, "good"), frame(2, "bad")];
    render(<TimelineStrip frames={frames} current={2} unit="step" onSeek={() => {}} />);
    expect(screen.getByRole("button", { name: /Step 1/ }).className).toContain("is-neutral");
    expect(screen.getByRole("button", { name: /Step 2/ }).className).toContain("is-good");
  });
});
