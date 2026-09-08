import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pullAll } = vi.hoisted(() => ({ pullAll: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/storage/sync", () => ({ pullAll }));

import { PullToRefresh } from "./PullToRefresh";

const t = (y: number) => ({ clientX: 0, clientY: y }) as Touch;

beforeEach(() => {
  pullAll.mockClear();
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  document.body.innerHTML = `<div class="index-sections"></div>`;
});

describe("PullToRefresh", () => {
  it("triggers a refresh when the pull exceeds the threshold at scrollTop 0", () => {
    render(<PullToRefresh />);
    const c = document.querySelector(".index-sections") as HTMLElement;
    fireEvent.touchStart(c, { touches: [t(10)] });
    fireEvent.touchMove(c, { touches: [t(100)] });
    fireEvent.touchEnd(c, {});
    expect(pullAll).toHaveBeenCalled();
  });

  it("does not refresh on a short pull", () => {
    render(<PullToRefresh />);
    const c = document.querySelector(".index-sections") as HTMLElement;
    fireEvent.touchStart(c, { touches: [t(10)] });
    fireEvent.touchMove(c, { touches: [t(40)] });
    fireEvent.touchEnd(c, {});
    expect(pullAll).not.toHaveBeenCalled();
  });

  it("ignores a pull when the page is scrolled", () => {
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    render(<PullToRefresh />);
    const c = document.querySelector(".index-sections") as HTMLElement;
    fireEvent.touchStart(c, { touches: [t(10)] });
    fireEvent.touchMove(c, { touches: [t(200)] });
    fireEvent.touchEnd(c, {});
    expect(pullAll).not.toHaveBeenCalled();
  });
});
