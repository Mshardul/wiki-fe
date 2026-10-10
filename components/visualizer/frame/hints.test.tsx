import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FieldSection } from "@/lib/visualizer/core/fields";
import { ConfigPanel } from "./ConfigPanel";

const SECTIONS: FieldSection[] = [
  {
    title: "",
    fields: [
      {
        kind: "chips",
        key: "pace",
        label: "Pace",
        param: "pc",
        options: [
          { value: "1", label: "1 per tick" },
          { value: "2", label: "1 per 2 ticks" },
        ],
      },
      { kind: "slider", key: "limit", label: "Limit", param: "l", min: 2, max: 5 },
    ],
  },
];
const VALUES = { pace: "2", limit: 3 };
const noop = () => {};

describe("availability hints", () => {
  it("shows a hint on chips and on an enabled slider", () => {
    render(
      <ConfigPanel
        sections={SECTIONS}
        values={VALUES}
        sequence={[]}
        onChange={noop}
        availability={{ pace: { hint: "Window 6" }, limit: { hint: "Max per window" } }}
      />,
    );
    expect(screen.getByText("Window 6")).toBeTruthy();
    expect(screen.getByText("Max per window")).toBeTruthy();
  });

  it("still shows why a slider is dimmed", () => {
    render(
      <ConfigPanel
        sections={SECTIONS}
        values={VALUES}
        sequence={[]}
        onChange={noop}
        availability={{ limit: { disabled: true, hint: "Used by one policy." } }}
      />,
    );
    expect(screen.getByText("Used by one policy.")).toBeTruthy();
    expect(screen.getByLabelText("Limit").hasAttribute("disabled")).toBe(true);
  });

  it("shows no hint when none is given", () => {
    const { container } = render(
      <ConfigPanel sections={SECTIONS} values={VALUES} sequence={[]} onChange={noop} />,
    );
    expect(container.querySelector(".viz-field__hint")).toBeNull();
  });
});
