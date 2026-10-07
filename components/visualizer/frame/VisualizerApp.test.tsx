import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clipboard", () => ({ writeToClipboard: vi.fn() }));
vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));

import { writeToClipboard } from "@/lib/clipboard";
import { showToast } from "@/lib/toast";
import { VisualizerApp } from "./VisualizerApp";

const at = (search: string) =>
  window.history.replaceState(null, "", `/visualizer/eviction-policies/${search}`);

beforeEach(() => {
  localStorage.clear();
  vi.mocked(writeToClipboard).mockReset();
  vi.mocked(showToast).mockReset();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
});

describe("VisualizerApp", () => {
  it("boots from the URL: policy, sequence and step", () => {
    at("?p=fifo&q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    expect(screen.getByRole("heading", { level: 1, name: "Eviction policies" })).toBeTruthy();
    expect(screen.getByText("request 8 / 12")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
  });

  it("controls move through the run", () => {
    at("?q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Next request" }));
    expect(screen.getByText("request 9 / 12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Request 3: C, miss" }));
    expect(screen.getByText("request 3 / 12")).toBeTruthy();
  });

  it("changing an input rebuilds the run and restarts", () => {
    at("?q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "CLOCK" }));
    expect(screen.getByRole("heading", { name: "CLOCK" })).toBeTruthy();
    expect(screen.getByText("request 1 / 12")).toBeTruthy();
    const seq = screen.getByLabelText("Sequence");
    fireEvent.change(seq, { target: { value: "ABCAB" } });
    fireEvent.keyDown(seq, { key: "Enter" });
    expect(screen.getByText("request 1 / 5")).toBeTruthy();
  });

  it("a Try experiment sets the inputs", () => {
    at("?q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("tab", { name: "Try" }));
    const run = screen.getAllByRole("button", { name: /Run/ })[0];
    if (!run) throw new Error("missing Run button");
    fireEvent.click(run);
    expect(screen.getByRole("button", { name: "Scan" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText<HTMLInputElement>("Sequence").value).toBe(
      "A B A B C D E F G H A B",
    );
  });

  it("collapsing a panel persists for next time", () => {
    at("");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Hide Configure" }));
    expect(screen.getByRole("button", { name: "Show Configure" })).toBeTruthy();
    expect(localStorage.getItem("wiki-visualizer-panels")).toBe('{"left":true,"right":false}');
  });

  it("Copy link copies the exact current state and confirms", async () => {
    vi.mocked(writeToClipboard).mockResolvedValue();
    at("?p=lfu&q=ABCADEAFBAGC&i=4");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    const url = vi.mocked(writeToClipboard).mock.calls[0]?.[0] ?? "";
    expect(url).toContain("/visualizer/eviction-policies/?p=lfu");
    expect(url).toContain("q=ABCADEAFBAGC");
    expect(url).toContain("i=4");
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Link copied"));
  });

  it("a blocked clipboard surfaces an error toast", async () => {
    vi.mocked(writeToClipboard).mockRejectedValue(new Error("denied"));
    at("");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Couldn't copy the link"));
  });

  it("an unknown slug fails loudly", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<VisualizerApp slug="nope" />)).toThrow("Unknown visualizer: nope");
    vi.restoreAllMocks();
  });
});
