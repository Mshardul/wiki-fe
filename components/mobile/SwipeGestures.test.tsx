import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerModal } from "@/components/common/modalRegistry";
import { setCardSwipeActive } from "./gestureState";
import { SwipeGestures } from "./SwipeGestures";

const t = (x: number, y: number) => ({ clientX: x, clientY: y }) as Touch;

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  document.body.innerHTML = "";
  setCardSwipeActive(false);
});
afterEach(() => vi.restoreAllMocks());

describe("SwipeGestures", () => {
  it("a left-edge swipe past the threshold goes back in history", () => {
    const back = vi.spyOn(history, "back").mockImplementation(() => {});
    render(<SwipeGestures />);
    fireEvent.touchStart(document, { touches: [t(10, 400)] });
    fireEvent.touchMove(document, { touches: [t(80, 402)] });
    fireEvent.touchEnd(document, { changedTouches: [t(120, 402)] });
    expect(back).toHaveBeenCalled();
  });

  it("a right-edge swipe on an article opens the TOC drawer", () => {
    document.body.innerHTML = `<article id="markdown-body"></article>`;
    const listener = vi.fn();
    document.addEventListener("wiki:open-toc-drawer", listener);
    render(<SwipeGestures />);
    fireEvent.touchStart(document, { touches: [t(390, 400)] });
    fireEvent.touchMove(document, { touches: [t(320, 402)] });
    fireEvent.touchEnd(document, { changedTouches: [t(280, 402)] });
    expect(listener).toHaveBeenCalled();
    document.removeEventListener("wiki:open-toc-drawer", listener);
  });

  it("a swipe-down with a panel open closes the topmost", () => {
    let open = true;
    const close = vi.fn(() => {
      open = false;
    });
    registerModal({ isOpen: () => open, close });
    render(<SwipeGestures />);
    fireEvent.touchStart(document, { touches: [t(200, 100)] });
    fireEvent.touchMove(document, { touches: [t(202, 190)] });
    fireEvent.touchEnd(document, { changedTouches: [t(202, 200)] });
    expect(close).toHaveBeenCalled();
  });

  it("stands down while an index-card swipe is active", () => {
    const back = vi.spyOn(history, "back").mockImplementation(() => {});
    setCardSwipeActive(true);
    render(<SwipeGestures />);
    fireEvent.touchStart(document, { touches: [t(10, 400)] });
    fireEvent.touchMove(document, { touches: [t(80, 402)] });
    fireEvent.touchEnd(document, { changedTouches: [t(120, 402)] });
    expect(back).not.toHaveBeenCalled();
  });

  it("is inert above the mobile breakpoint", () => {
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    const back = vi.spyOn(history, "back").mockImplementation(() => {});
    render(<SwipeGestures />);
    fireEvent.touchStart(document, { touches: [t(10, 400)] });
    fireEvent.touchMove(document, { touches: [t(80, 402)] });
    fireEvent.touchEnd(document, { changedTouches: [t(120, 402)] });
    expect(back).not.toHaveBeenCalled();
  });
});
