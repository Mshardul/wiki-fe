import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollRestore } from "./ScrollRestore";

describe("ScrollRestore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not silently scroll to the saved offset", () => {
    history.replaceState(null, "", "/dsa/x/");
    localStorage.setItem("wiki-toc-scroll-article-dsa-content-dsa-x.md", "600");
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    render(<ScrollRestore wikiId="dsa" articlePath="content/dsa/x.md" />);

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("saves the current scrollY on unmount", () => {
    vi.useFakeTimers();
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 422 });

    const { unmount } = render(<ScrollRestore wikiId="dsa" articlePath="content/dsa/x.md" />);

    unmount();

    const savedY = Number(
      localStorage.getItem("wiki-toc-scroll-article-dsa-content-dsa-x.md") ?? "0",
    );
    expect(savedY).toBe(422);
  });
});
