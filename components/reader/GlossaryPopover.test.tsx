import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlossaryPopover } from "./GlossaryPopover";

function withTerm() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <p>The
        <abbr class="glossary-term glossary-term--expandable" role="button" tabindex="0" aria-expanded="false">amortized</abbr>
        <span class="glossary-inline-def" aria-hidden="true">avg cost per op</span>
        cost.
      </p>
    </article>`;
}

describe("GlossaryPopover", () => {
  it("shows a popover with the definition on hover", () => {
    withTerm();
    render(<GlossaryPopover />);
    fireEvent.mouseEnter(document.querySelector(".glossary-term") as Element);
    const pop = document.querySelector(".glossary-popover") as HTMLElement;
    expect(pop.classList.contains("glossary-popover--visible")).toBe(true);
    expect(pop.textContent).toBe("avg cost per op");
  });

  it("expands the inline definition on click", () => {
    withTerm();
    render(<GlossaryPopover />);
    const term = document.querySelector(".glossary-term") as HTMLElement;
    const def = document.querySelector(".glossary-inline-def") as HTMLElement;
    fireEvent.click(term);
    expect(term.getAttribute("aria-expanded")).toBe("true");
    expect(def.getAttribute("aria-hidden")).toBe("false");
    expect(def.classList.contains("glossary-inline-def--open")).toBe(true);
  });

  it("closes an open expansion on an outside click", () => {
    withTerm();
    render(<GlossaryPopover />);
    const term = document.querySelector(".glossary-term") as HTMLElement;
    fireEvent.click(term);
    fireEvent.click(document.body);
    expect(term.getAttribute("aria-expanded")).toBe("false");
  });
});
