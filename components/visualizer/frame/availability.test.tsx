import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FieldSection } from "@/lib/visualizer/core/fields";
import { ConfigPanel } from "./ConfigPanel";

const sections: FieldSection[] = [
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "lifetime", label: "Entry lifetime", param: "ttl", min: 2, max: 8 },
      { kind: "slider", key: "flush", label: "Flush every", param: "fl", min: 2, max: 6 },
    ],
  },
];
const values = { lifetime: 5, flush: 3 };

describe("field availability", () => {
  it("dims a slider and shows why", () => {
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={[]}
        onChange={() => {}}
        availability={{ lifetime: { disabled: true, hint: "Used by read-through." } }}
      />,
    );
    expect(screen.getByLabelText("Entry lifetime")).toHaveProperty("disabled", true);
    expect(screen.getByText("Used by read-through.")).toBeTruthy();
    expect(screen.getByLabelText("Flush every")).toHaveProperty("disabled", false);
  });

  it("leaves everything enabled when no availability is given", () => {
    render(<ConfigPanel sections={sections} values={values} sequence={[]} onChange={() => {}} />);
    expect(screen.getByLabelText("Entry lifetime")).toHaveProperty("disabled", false);
  });

  it("still reports changes on an enabled slider", () => {
    const onChange = vi.fn();
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={[]}
        onChange={onChange}
        availability={{ lifetime: { disabled: true } }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Flush every"), { target: { value: "4" } });
    expect(onChange).toHaveBeenCalledWith("flush", 4);
  });
});
