import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnchorScroll } from "./AnchorScroll";

describe("AnchorScroll", () => {
  it("smooth-scrolls to the target and pushes ?a= on an in-article hash click", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <h2 id="how-it-works">How it works<a href="#how-it-works">#</a></h2>
      </article>`;
    const target = document.getElementById("how-it-works") as HTMLElement;
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    render(<AnchorScroll />);
    fireEvent.click(document.querySelector('a[href="#how-it-works"]') as Element);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(new URL(location.href).searchParams.get("a")).toBe("how-it-works");
  });

  it("expands a collapsed parent section before scrolling to a heading inside it", () => {
    history.replaceState(null, "", "/dsa/x/");
    document.body.innerHTML = `
      <article class="markdown-body">
        <a href="#child">jump</a>
        <div class="section">
          <div class="section-title"><h2 id="parent" class="section--collapsed">Parent</h2></div>
          <div class="section-body" hidden><h3 id="child">Child</h3></div>
        </div>
      </article>`;
    const scrollIntoView = vi.fn();
    (document.getElementById("child") as HTMLElement).scrollIntoView = scrollIntoView;

    render(<AnchorScroll />);
    fireEvent.click(document.querySelector('a[href="#child"]') as Element);

    expect((document.querySelector(".section-body") as HTMLElement).hidden).toBe(false);
    expect(document.getElementById("parent")?.classList.contains("section--collapsed")).toBe(false);
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("honours a ?a= deep link on mount", () => {
    history.replaceState(null, "", "/dsa/x/?a=deep");
    document.body.innerHTML = `<article class="markdown-body"><h2 id="deep">Deep</h2></article>`;
    const target = document.getElementById("deep") as HTMLElement;
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    render(<AnchorScroll />);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "instant", block: "start" });
    vi.unstubAllGlobals();
  });
});
