import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MechanismApp } from "./MechanismApp";

describe("MechanismApp", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    window.history.replaceState(null, "", "/visualizer/inside-the-python-gil/");
  });

  it("opens the happy path and steps into scenario 1 from the start", async () => {
    const user = userEvent.setup();
    render(<MechanismApp slug="inside-the-python-gil" glossary={{}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Inside the Python GIL" })).toBeTruthy();
    expect(screen.getByText("CPython 3.12+ · default build · switch interval 5 ms")).toBeTruthy();
    expect(screen.getByText(/I\/O-bound threads interleave/)).toBeTruthy();
    expect(
      screen.getByText(
        "The GIL serializes Python bytecode, not waiting. Threads are a valid tool for blocking I/O.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
    expect(screen.getByText("Running Python (holds GIL)")).toBeTruthy();
    expect(screen.queryByText("Drop request")).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "T1 runs" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^Step 2: T1 hits a blocking call/ }).textContent,
    ).toBe("2");
    expect(screen.queryByRole("button", { name: "Revision" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Read article/ })).toBeNull();

    await user.click(screen.getByRole("tab", { name: /Scenario 1/ }));
    expect(screen.getByText("Why don't more threads speed up CPU-bound code?")).toBeTruthy();
    expect(screen.getByText(/step 1 \/ 8/)).toBeTruthy();
    expect(screen.getByText("Drop request")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: /Scenario 3/ }));
    const versionA = screen.getByRole("group", { name: "Version A · counter += 1" });
    const versionB = screen.getByRole("group", { name: "Version B · counter += one()" });
    expect(versionA.querySelectorAll(".viz-strip__cell")).toHaveLength(4);
    expect(versionB.querySelectorAll(".viz-strip__cell")).toHaveLength(4);
  });
});
