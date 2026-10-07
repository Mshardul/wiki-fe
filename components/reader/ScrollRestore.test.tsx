import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveScrollPosition } from "@/lib/storage/scroll-collapse";
import { ScrollRestore } from "./ScrollRestore";

describe("ScrollRestore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  function runFrames() {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  }

  it("jumps instantly to the saved offset, overriding the page's smooth scrolling", () => {
    history.replaceState(null, "", "/dsa/x/");
    saveScrollPosition("dsa", "content/dsa/x.md", 600);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    runFrames();

    render(<ScrollRestore wikiId="dsa" articlePath="content/dsa/x.md" />);

    expect(scrollTo).toHaveBeenCalledWith({ top: 600, behavior: "instant" });
  });

  it("leaves a ?a= deep link to AnchorScroll", () => {
    history.replaceState(null, "", "/dsa/x/?a=deep");
    saveScrollPosition("dsa", "content/dsa/x.md", 600);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    runFrames();

    render(<ScrollRestore wikiId="dsa" articlePath="content/dsa/x.md" />);

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
