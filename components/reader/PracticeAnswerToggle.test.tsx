import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { updateSettings } from "@/lib/storage/settings";
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

  it("starts answers visible when the preference says to show them", () => {
    updateSettings({ practiceAnswersHidden: false });
    withProblem();
    render(<PracticeAnswerToggle />);
    expect((document.querySelector(".problem-answer") as HTMLElement).hidden).toBe(false);
    expect(document.querySelector(".practice-eye-btn")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("syncs open answers when the preference changes mid-view", () => {
    withProblem();
    render(<PracticeAnswerToggle />);
    const answer = document.querySelector(".problem-answer") as HTMLElement;

    updateSettings({ practiceAnswersHidden: false });
    expect(answer.hidden).toBe(false);
    updateSettings({ practiceAnswersHidden: true });
    expect(answer.hidden).toBe(true);
  });

  it("keeps a per-problem reveal when an unrelated setting changes", () => {
    withProblem();
    render(<PracticeAnswerToggle />);
    const answer = document.querySelector(".problem-answer") as HTMLElement;
    (document.querySelector(".practice-eye-btn") as HTMLButtonElement).click();

    updateSettings({ fontSize: "L" });
    expect(answer.hidden).toBe(false);
  });
});
