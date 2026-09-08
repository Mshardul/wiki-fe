import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FocusMode } from "./FocusMode";

function mockObserver() {
  const observed: Element[] = [];
  let cb: IntersectionObserverCallback = () => {};
  class M {
    constructor(fn: IntersectionObserverCallback) {
      cb = fn;
    }
    observe(el: Element) {
      observed.push(el);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", M);
  return {
    observed,
    fire: (el: Element, isIntersecting: boolean) =>
      cb([{ target: el, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver),
  };
}

describe("FocusMode", () => {
  it("adds .focus-mode and dims paragraphs outside the central band", () => {
    document.body.innerHTML = `
      <article class="markdown-body"><p id="a">one</p><p id="b">two</p></article>`;
    const obs = mockObserver();

    render(<FocusMode active />);
    const root = document.querySelector(".markdown-body") as HTMLElement;
    expect(root.classList.contains("focus-mode")).toBe(true);
    expect(obs.observed.length).toBe(2);

    obs.fire(document.getElementById("a") as Element, true);
    expect(document.getElementById("a")?.classList.contains("focus-para")).toBe(true);

    vi.unstubAllGlobals();
  });

  it("does nothing while inactive and cleans up on deactivate", () => {
    document.body.innerHTML = `<article class="markdown-body"><p>one</p></article>`;
    mockObserver();
    const { rerender } = render(<FocusMode active />);
    const root = document.querySelector(".markdown-body") as HTMLElement;
    expect(root.classList.contains("focus-mode")).toBe(true);

    rerender(<FocusMode active={false} />);
    expect(root.classList.contains("focus-mode")).toBe(false);
    vi.unstubAllGlobals();
  });
});
