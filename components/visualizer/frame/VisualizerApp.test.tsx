import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Eviction policies" })).toBeTruthy();
    expect(screen.getByText("request 8 / 12")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
  });

  it("controls move through the run", () => {
    at("?q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Next request" }));
    expect(screen.getByText("request 9 / 12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Request 3: C, miss" }));
    expect(screen.getByText("request 3 / 12")).toBeTruthy();
  });

  it("changing an input rebuilds the run and restarts", () => {
    at("?q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Loop" }));
    expect(screen.getByText(/request 1 \//)).toBeTruthy();
    const seq = screen.getByLabelText("Sequence");
    fireEvent.change(seq, { target: { value: "ABCAB" } });
    fireEvent.keyDown(seq, { key: "Enter" });
    expect(screen.getByText("request 1 / 5")).toBeTruthy();
  });

  it("a Try experiment sets the inputs", () => {
    at("?q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
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
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide Configure" }));
    expect(screen.getByRole("button", { name: "Show Configure" })).toBeTruthy();
    expect(localStorage.getItem("wiki-visualizer-panels")).toBe('{"left":true,"right":false}');
  });

  it("Copy link copies the exact current state and confirms", async () => {
    vi.mocked(writeToClipboard).mockResolvedValue();
    at("?p=lfu&q=ABCADEAFBAGC&i=4");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
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
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Couldn't copy the link"));
  });

  it("an unknown slug fails loudly", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<VisualizerApp slug="nope" glossary={{}} />)).toThrow(
      "Unknown visualizer: nope",
    );
    vi.restoreAllMocks();
  });

  it("switching policy keeps the step and does not restart", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    expect(screen.getByText("request 8 / 12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "FIFO" }));
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
    expect(screen.getByText("request 8 / 12")).toBeTruthy();
  });

  it("next and previous policy buttons follow the chip order and wrap", () => {
    at("?p=clock&q=ABCADEAFBAGC&i=3");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Next policy" }));
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous policy" }));
    expect(screen.getByRole("heading", { name: "CLOCK" })).toBeTruthy();
    expect(screen.getByText("request 3 / 12")).toBeTruthy();
  });

  it("Shift+arrows switch policy and plain arrows still step", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=3");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true });
    expect(screen.getByRole("heading", { name: "LFU" })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.getByText("request 4 / 12")).toBeTruthy();
  });

  it("a paused frame still has an active line after switching policy", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=5");
    const { container } = render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: /pause|play/i }));
    fireEvent.click(screen.getByRole("button", { name: "CLOCK" }));
    const group = within(container.querySelector(".viz-steps") as HTMLElement);
    expect(
      group.getAllByRole("listitem").some((li) => li.getAttribute("aria-current") === "step"),
    ).toBe(true);
  });

  it("shows the view toggle and boots the revision view from the URL", () => {
    at("?view=revision");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    expect(screen.getByRole("button", { name: "Revision" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "FIFO",
      "LRU",
      "LFU",
      "CLOCK",
    ]);
    expect(screen.queryByRole("button", { name: "Next request" })).toBeNull();
    expect(screen.queryByLabelText("Sequence")).toBeNull();
  });

  it("switching views swaps the single page for the revision grid and back", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=5");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Revision" }));
    expect(screen.getByRole("button", { name: "Pause loop" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next request" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Single" }));
    expect(screen.getByText("request 5 / 12")).toBeTruthy();
  });

  it("plain and Shift arrows do nothing in revision, and Space toggles the loop", () => {
    at("?view=revision&p=lru&q=ABCADEAFBAGC&i=5");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(document.body, { key: " " });
    expect(screen.getByRole("button", { name: "Play loop" })).toBeTruthy();
  });

  it("Open in Single from the popup lands on that policy at the first request", () => {
    at("?view=revision&q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" glossary={{ lru: "LRU GLOSSARY" }} />);
    fireEvent.click(screen.getByRole("button", { name: "About LRU" }));
    fireEvent.click(screen.getByRole("button", { name: /Open in Single/ }));
    expect(screen.getByRole("heading", { name: "LRU" })).toBeTruthy();
    expect(screen.getByText(/request 1 \//)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Single" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(document.activeElement?.textContent).toBe("LRU");
  });

  it("the copied link carries view=revision", async () => {
    at("?view=revision");
    vi.mocked(writeToClipboard).mockResolvedValue(undefined);
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeToClipboard).toHaveBeenCalled());
    expect(String(vi.mocked(writeToClipboard).mock.calls[0]?.[0])).toContain("view=revision");
  });

  it("the caching visualizer has the same two views", () => {
    at("?view=revision");
    render(<VisualizerApp slug="caching-strategies" glossary={{}} />);
    expect(screen.getByRole("heading", { level: 3, name: "Cache-aside" })).toBeTruthy();
  });

  it("switching rate-limiting algorithm restarts from the first request", () => {
    window.history.replaceState(
      null,
      "",
      "/visualizer/rate-limiting/?a=fixed-window&l=3&pc=2&q=4_5_5_6_6_7_7_11&i=8",
    );
    render(<VisualizerApp slug="rate-limiting" glossary={{}} />);
    expect(screen.getByText("request 8 / 8")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sliding log" }));
    expect(screen.getByRole("heading", { name: "Sliding log" })).toBeTruthy();
    expect(screen.getByText("request 1 / 8")).toBeTruthy();
  });
});
