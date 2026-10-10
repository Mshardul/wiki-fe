import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEYS } from "@/lib/storage/keys";
import { cachingModule } from "@/lib/visualizer/caching/module";
import { evictionModule } from "@/lib/visualizer/eviction/module";
import { rateLimitingModule } from "@/lib/visualizer/rate-limiting/module";
import { RevisionView } from "./RevisionView";

const reduced = (on: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: on, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );

beforeEach(() => {
  localStorage.clear();
  reduced(false);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 1200 });
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

const names = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("RevisionView", () => {
  it("shows the default order and the loop toggle", () => {
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    expect(names()).toEqual(["FIFO", "LRU", "LFU", "CLOCK"]);
    expect(screen.getByRole("button", { name: "Pause loop" })).toBeTruthy();
  });

  it("shows the flow legend only when a card draws a flow diagram", () => {
    const { unmount } = render(
      <RevisionView mod={cachingModule} glossary={{}} onOpen={() => {}} />,
    );
    expect(screen.getByText("Synchronous")).toBeTruthy();
    expect(screen.getByText("Asynchronous or background")).toBeTruthy();
    expect(screen.getByText("Conditional or fallback")).toBeTruthy();
    unmount();
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    expect(screen.queryByText("Synchronous")).toBeNull();
    expect(screen.queryByText("Step order")).toBeNull();
  });

  it("renders every algorithm card without React key warnings", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<RevisionView mod={rateLimitingModule} glossary={{}} onOpen={() => {}} />);
    expect(names()).toHaveLength(5);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("the toggle and Space pause and resume the loop", () => {
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause loop" }));
    expect(screen.getByRole("button", { name: "Play loop" })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: " " });
    expect(screen.getByRole("button", { name: "Pause loop" })).toBeTruthy();
  });

  it("under reduced motion there is no loop toggle", () => {
    reduced(true);
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    expect(screen.queryByRole("button", { name: /loop/i })).toBeNull();
    expect(names()).toHaveLength(4);
  });

  it("loads a saved order, repairs it, and ignores junk", () => {
    localStorage.setItem(
      KEYS.visualizerOrder,
      JSON.stringify({ "eviction-policies": ["clock", "ghost", "lru"] }),
    );
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    expect(names()).toEqual(["CLOCK", "LRU", "FIFO", "LFU"]);
  });

  it("keyboard reorder is saved per visualizer and Reset order restores the default", () => {
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    const grip = screen.getByRole("button", { name: "Reorder FIFO" });
    fireEvent.keyDown(grip, { key: " " });
    fireEvent.keyDown(grip, { key: "ArrowRight" });
    expect(names()).toEqual(["LRU", "FIFO", "LFU", "CLOCK"]);
    expect(JSON.parse(localStorage.getItem(KEYS.visualizerOrder) ?? "{}")).toEqual({
      "eviction-policies": ["lru", "fifo", "lfu", "clock"],
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset order" }));
    expect(names()).toEqual(["FIFO", "LRU", "LFU", "CLOCK"]);
    expect(localStorage.getItem(KEYS.visualizerOrder)).not.toContain('lru","fifo');
  });

  it("another visualizer keeps its own order", () => {
    localStorage.setItem(KEYS.visualizerOrder, JSON.stringify({ "eviction-policies": ["clock"] }));
    render(<RevisionView mod={cachingModule} glossary={{}} onOpen={() => {}} />);
    expect(names()[0]).toBe("Cache-aside");
  });

  it("the info popup shows the glossary definition, how it differs, and opens the variant", () => {
    const onOpen = vi.fn();
    render(
      <RevisionView mod={evictionModule} glossary={{ lru: "GLOSSARY LRU TEXT" }} onOpen={onOpen} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "About LRU" }));
    const dialog = screen.getByRole("dialog", { name: "About LRU" });
    expect(within(dialog).getByText("GLOSSARY LRU TEXT")).toBeTruthy();
    expect(within(dialog).getByText(/Unlike FIFO, a hit renews a key/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /Open in Single/ }));
    expect(onOpen).toHaveBeenCalledWith("lru");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("falls back to the module summary when the glossary has no entry, and Escape closes", () => {
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "About LRU" }));
    expect(screen.getByText(/Least recently used: the key untouched/)).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the popup works for a flow card too", () => {
    render(<RevisionView mod={cachingModule} glossary={{}} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "About Write-behind" }));
    expect(screen.getByRole("dialog", { name: "About Write-behind" })).toBeTruthy();
  });

  it("a module with no revision renders an empty grid without throwing", () => {
    act(() => {
      render(
        <RevisionView
          mod={{ ...evictionModule, revision: undefined }}
          glossary={{}}
          onOpen={() => {}}
        />,
      );
    });
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });
});
