import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PracticeAnswerToggle } from "./PracticeAnswerToggle";

function withProblem() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <div class="section">
        <div class="section-title"><h2>Practice problems</h2></div>
        <div class="section-body">
          <div class="subsection">
            <div class="subsection-title"><h3>Two Sum</h3></div>
            <div class="subsection-body">
              <div class="problem-answer" hidden>
                <p><strong>Approach:</strong> hash map</p>
                <p><strong>Complexity:</strong> O(n)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>`;
}

describe("PracticeAnswerToggle", () => {
  it("adds an eye button that reveals and re-hides the answer", () => {
    withProblem();
    render(<PracticeAnswerToggle />);

    const btn = document.querySelector(".practice-eye-btn") as HTMLButtonElement;
    const answer = document.querySelector(".problem-answer") as HTMLElement;
    expect(answer.hidden).toBe(true);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.innerHTML).toContain("icon-eye-off");

    btn.click();
    expect(answer.hidden).toBe(false);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.innerHTML).toContain('href="#icon-eye"');

    btn.click();
    expect(answer.hidden).toBe(true);
  });
});
