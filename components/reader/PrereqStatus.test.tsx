import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { markCompleted } from "@/lib/storage/completions";
import { PrereqStatus } from "./PrereqStatus";

function withChips() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <div class="prereqs-container">
        <a class="prereq-chip" href="/dsa/data-structures/hash-table/" data-prereq-path="dsa/data-structures/hash-table">
          <span class="chip-status" aria-hidden="true"></span>Hash Table
        </a>
        <a class="prereq-chip" href="/dsa/data-structures/array/" data-prereq-path="dsa/data-structures/array">
          <span class="chip-status" aria-hidden="true"></span>Array
        </a>
      </div>
    </article>`;
}

describe("PrereqStatus", () => {
  it("marks a chip done when its path is a completion", () => {
    markCompleted("dsa", "dsa/data-structures/hash-table");
    withChips();
    render(<PrereqStatus wikiId="dsa" />);

    const chips = document.querySelectorAll(".prereq-chip");
    expect(chips[0]!.classList.contains("prereq-chip--done")).toBe(true);
    expect(chips[0]!.querySelector(".chip-status")?.classList.contains("chip-status--done")).toBe(
      true,
    );
    expect(chips[1]!.classList.contains("prereq-chip--done")).toBe(false);
  });

  it("re-applies when completions change", () => {
    withChips();
    render(<PrereqStatus wikiId="dsa" />);
    expect(document.querySelector(".prereq-chip")?.classList.contains("prereq-chip--done")).toBe(
      false,
    );
    markCompleted("dsa", "dsa/data-structures/hash-table");
    expect(document.querySelector(".prereq-chip")?.classList.contains("prereq-chip--done")).toBe(
      true,
    );
  });
});
