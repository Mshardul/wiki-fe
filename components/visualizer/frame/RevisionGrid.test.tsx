import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cachingRevision } from "@/lib/visualizer/caching/revision";
import { POLICIES } from "@/lib/visualizer/eviction/module";
import { evictionRevision } from "@/lib/visualizer/eviction/revision";
import { RevisionGrid } from "./RevisionGrid";

const cards = evictionRevision(POLICIES);
const ORDER = cards.map((c) => c.id);

const setWidth = (w: number) =>
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: w });

beforeEach(() => setWidth(1200));
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

// Row sizes: tiles between the layout's break markers, in DOM order.
const rowSizes = (): number[] => {
  const sizes: number[] = [0];
  for (const el of document.querySelector(".viz-rev__inner")?.children ?? []) {
    if (el.classList.contains("viz-rev__break")) sizes.push(0);
    else if (el.classList.contains("viz-card")) sizes[sizes.length - 1] = (sizes.at(-1) ?? 0) + 1;
  }
  return sizes;
};

const names = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

function setup(order = ORDER, onOrder = vi.fn(), onInfo = vi.fn(), source = cards) {
  render(
    <RevisionGrid
      cards={source}
      order={order}
      onOrder={onOrder}
      lit={3}
      pulse={false}
      subject="Cache"
      onInfo={onInfo}
    />,
  );
  return { onOrder, onInfo };
}

describe("RevisionGrid", () => {
  it("renders every card in the given order, showing only its name and animation", () => {
    setup(["clock", "fifo", "lru", "lfu"]);
    expect(names()).toEqual(["CLOCK", "FIFO", "LRU", "LFU"]);
  });

  it("splits cards into rows by the measured width", () => {
    setup();
    expect(rowSizes()).toEqual([4]);
  });

  it("at a medium width four cards become two rows of two", () => {
    setWidth(900);
    setup();
    expect(rowSizes()).toEqual([2, 2]);
  });

  it("an odd count at two columns ends in one card on its own row", () => {
    setWidth(600);
    setup(["fifo", "lru", "lfu"].concat([]), vi.fn(), vi.fn(), cards.slice(0, 3));
    expect(rowSizes()).toEqual([2, 1]);
  });

  it("a width of zero still shows every card", () => {
    setWidth(0);
    setup();
    expect(names()).toHaveLength(4);
  });

  it("the card itself is not clickable; its info button reports the id", () => {
    const { onInfo } = setup();
    fireEvent.click(screen.getByRole("heading", { name: "LRU" }));
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "About LRU" }));
    expect(onInfo).toHaveBeenCalledWith("lru");
  });

  it("reorders with the keyboard: Space picks up, arrows move, Space drops", () => {
    const { onOrder } = setup();
    const grip = screen.getByRole("button", { name: "Reorder FIFO" });
    fireEvent.keyDown(grip, { key: " " });
    fireEvent.keyDown(grip, { key: "ArrowRight" });
    expect(onOrder).toHaveBeenLastCalledWith(["lru", "fifo", "lfu", "clock"]);
  });

  it("arrow keys do nothing until a card is picked up", () => {
    const { onOrder } = setup();
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder FIFO" }), { key: "ArrowRight" });
    expect(onOrder).not.toHaveBeenCalled();
  });

  it("Escape cancels a pickup and restores the order it started from", () => {
    const { onOrder } = setup();
    const grip = screen.getByRole("button", { name: "Reorder FIFO" });
    fireEvent.keyDown(grip, { key: " " });
    fireEvent.keyDown(grip, { key: "ArrowRight" });
    fireEvent.keyDown(grip, { key: "Escape" });
    expect(onOrder).toHaveBeenLastCalledWith(ORDER);
  });

  it("the first card cannot move left and the last cannot move right", () => {
    const { onOrder } = setup();
    const first = screen.getByRole("button", { name: "Reorder FIFO" });
    fireEvent.keyDown(first, { key: " " });
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(onOrder).not.toHaveBeenCalled();
  });

  it("drags a card onto another to reorder", () => {
    const { onOrder } = setup();
    const lru = screen.getByRole("heading", { name: "LRU" }).closest(".viz-card") as HTMLElement;
    const clock = screen
      .getByRole("heading", { name: "CLOCK" })
      .closest(".viz-card") as HTMLElement;
    const grip = within(lru).getByRole("button", { name: "Reorder LRU" });
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.mouseDown(grip);
    fireEvent.dragStart(lru, { dataTransfer });
    fireEvent.dragOver(clock, { dataTransfer });
    fireEvent.drop(clock, { dataTransfer });
    expect(onOrder).toHaveBeenCalledWith(["fifo", "lfu", "clock", "lru"]);
  });

  it("a drag that did not start on the grip is cancelled", () => {
    const { onOrder } = setup();
    const lru = screen.getByRole("heading", { name: "LRU" }).closest(".viz-card") as HTMLElement;
    const clock = screen
      .getByRole("heading", { name: "CLOCK" })
      .closest(".viz-card") as HTMLElement;
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.dragStart(lru, { dataTransfer });
    fireEvent.drop(clock, { dataTransfer });
    expect(onOrder).not.toHaveBeenCalled();
  });

  it("flow cards render a labelled diagram and a screen-reader step list", () => {
    setup(
      cachingRevision().map((c) => c.id),
      vi.fn(),
      vi.fn(),
      cachingRevision(),
    );
    expect(screen.getByRole("img", { name: /Cache-aside/ })).toBeTruthy();
    expect(screen.getAllByRole("list").length).toBeGreaterThan(0);
  });

  it("ids in the order that no card has are skipped", () => {
    setup(["gone", ...ORDER]);
    expect(names()).toEqual(["FIFO", "LRU", "LFU", "CLOCK"]);
  });

  it("a picked-up card keeps keyboard focus on its grip while it moves between rows", () => {
    setWidth(900);
    function Harness() {
      const [order, setOrder] = useState(ORDER);
      return (
        <RevisionGrid
          cards={cards}
          order={order}
          onOrder={setOrder}
          lit={3}
          pulse={false}
          subject="Cache"
          onInfo={() => {}}
        />
      );
    }
    render(<Harness />);
    const grip = () => screen.getByRole("button", { name: "Reorder LRU" });
    grip().focus();
    fireEvent.keyDown(grip(), { key: " " });
    fireEvent.keyDown(grip(), { key: "ArrowRight" });
    expect(names()).toEqual(["FIFO", "LFU", "LRU", "CLOCK"]);
    expect(document.activeElement).toBe(grip());
    fireEvent.keyDown(grip(), { key: "ArrowRight" });
    expect(names()).toEqual(["FIFO", "LFU", "CLOCK", "LRU"]);
    expect(document.activeElement).toBe(grip());
  });

  it("releasing the mouse without dragging disarms a later drag from elsewhere on a card", () => {
    const { onOrder } = setup();
    const lru = screen.getByRole("heading", { name: "LRU" }).closest(".viz-card") as HTMLElement;
    const clock = screen
      .getByRole("heading", { name: "CLOCK" })
      .closest(".viz-card") as HTMLElement;
    const grip = within(lru).getByRole("button", { name: "Reorder LRU" });
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.mouseDown(grip);
    fireEvent.mouseUp(document);
    fireEvent.dragStart(lru, { dataTransfer });
    fireEvent.drop(clock, { dataTransfer });
    expect(onOrder).not.toHaveBeenCalled();
  });
});
