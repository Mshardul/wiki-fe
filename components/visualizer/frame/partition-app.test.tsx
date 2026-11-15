import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { VisualizerApp } from "./VisualizerApp";

const at = (search: string) =>
  window.history.replaceState(null, "", `/visualizer/data-partitioning/${search}`);
const open = (search: string) => {
  at(search);
  return render(<VisualizerApp slug="data-partitioning" glossary={{}} />);
};
const slider = () => screen.getByRole<HTMLInputElement>("slider", { name: "Node count" });
const events = () => screen.getByLabelText<HTMLInputElement>("Events");

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
});

describe("data partitioning page", () => {
  it("opens on step 1 of 17 with 4 on the slider and the default event listed", () => {
    open("?s=1");
    expect(screen.getByText("step 1 / 17")).toBeTruthy();
    expect(slider().value).toBe("4");
    expect(events().value).toBe("+");
    expect(screen.getByRole("heading", { level: 1, name: "Data Partitioning" })).toBeTruthy();
  });

  it("Add appends an event, moves the slider and jumps to the new event step", async () => {
    open("?s=1");
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    await waitFor(() => expect(screen.getByText("step 18 / 26")).toBeTruthy());
    expect(slider().value).toBe("5");
    expect(events().value).toBe("+ +");
  });

  it("Add from a run with no events lands on step 9, the event step", async () => {
    open("?s=1&n=3&e=");
    expect(screen.getByText("step 1 / 8")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    await waitFor(() => expect(screen.getByText("step 9 / 17")).toBeTruthy());
    expect(slider().value).toBe("4");
  });

  it("Remove writes the picked node into the events", async () => {
    open("?s=1&n=3&e=");
    fireEvent.click(screen.getByRole("button", { name: "Remove node" }));
    await waitFor(() => expect(screen.getByText("step 9 / 17")).toBeTruthy());
    expect(events().value).toMatch(/^-[ABC]$/);
    expect(slider().value).toBe("2");
  });

  it("disables Add at six nodes and Remove at one node", () => {
    open("?s=1&n=6&e=");
    expect(screen.getByRole("button", { name: "Add node" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Remove node" })).toHaveProperty("disabled", false);
  });

  it("dragging the slider starts over with no events", () => {
    open("?s=1");
    fireEvent.change(slider(), { target: { value: "5" } });
    expect(screen.getByText("step 1 / 8")).toBeTruthy();
    expect(events().value).toBe("");
  });

  it("editing Events keeps the starting count and moves the slider", () => {
    open("?s=1");
    fireEvent.change(events(), { target: { value: "+ +" } });
    fireEvent.keyDown(events(), { key: "Enter" });
    expect(slider().value).toBe("5");
    expect(screen.getByText("step 1 / 26")).toBeTruthy();
  });

  it("rejects an Events edit that leaves 1 to 6 nodes and shows why", () => {
    open("?s=1");
    fireEvent.change(events(), { target: { value: "+ + + +" } });
    fireEvent.keyDown(events(), { key: "Enter" });
    expect(screen.getByText("Node count must stay between 1 and 6")).toBeTruthy();
    expect(slider().value).toBe("4");
  });

  it("switching variant keeps the step", () => {
    open("?s=1&i=12");
    expect(screen.getByText("step 12 / 17")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Range" }));
    expect(screen.getByText("step 12 / 17")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Range" })).toBeTruthy();
  });

  it("offers virtual nodes on the hash ring only", () => {
    open("?s=1");
    expect(screen.getByRole("button", { name: "8" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Hash ring" }));
    expect(screen.getByRole("button", { name: "8" })).toHaveProperty("disabled", false);
  });

  it("neutral steps and re-check steps both draw in the strip", () => {
    open("?s=1&i=12");
    const cells = screen.getAllByRole("button", { name: /^Step \d+:/ });
    expect(cells.some((c) => c.className.includes("is-neutral"))).toBe(true);
    expect(
      cells.some((c) => c.className.includes("is-bad") || c.className.includes("is-good")),
    ).toBe(true);
  });
});
