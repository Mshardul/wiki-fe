import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("katex", () => ({
  default: { renderToString: (s: string) => `<span class="katex">rendered:${s}</span>` },
}));

import { LatexToggle } from "./LatexToggle";

function withFormula(tex: string) {
  document.body.innerHTML = `
    <article class="markdown-body">
      <span class="katex-display">
        <span class="katex">
          <span class="katex-mathml">
            <math><semantics><annotation encoding="application/x-tex">${tex}</annotation></semantics></math>
          </span>
        </span>
      </span>
    </article>`;
}

describe("LatexToggle", () => {
  it("adds a copy-LaTeX button that copies the source", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    withFormula("T = O(n)");
    render(<LatexToggle />);
    const copyBtn = document.querySelector(".latex-copy-btn") as HTMLButtonElement;
    copyBtn.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("T = O(n)");
  });

  it("adds an αβ toggle only when substitution changes the LaTeX, and re-renders on click", async () => {
    withFormula("T = O(n)");
    render(<LatexToggle />);
    const toggle = document.querySelector(".formula-toggle-btn") as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    toggle.click();
    await vi.waitFor(() =>
      expect(document.querySelector(".formula-toggle-wrapper")?.textContent).toContain(
        "\\text{time}",
      ),
    );
  });

  it("omits the αβ toggle when substitution is a no-op", () => {
    withFormula("\\alpha + \\beta");
    render(<LatexToggle />);
    expect(document.querySelector(".formula-toggle-btn")).toBeNull();
    expect(document.querySelector(".latex-copy-btn")).toBeTruthy();
  });
});
