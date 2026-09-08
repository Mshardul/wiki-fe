import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonTable } from "./ComparisonTable";

function table() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <table data-comparison="true">
        <thead><tr>
          <th data-col-key="Operation">Operation</th>
          <th data-col-key="Time" data-col-numeric="true">Time</th>
          <th data-col-key="Notes">Notes</th>
        </tr></thead>
        <tbody>
          <tr><td>Search</td><td>O(n)</td><td>linear</td></tr>
          <tr><td>Access</td><td>O(1)</td><td>direct</td></tr>
          <tr><td>Sort</td><td>O(n log n)</td><td>merge</td></tr>
        </tbody>
      </table>
    </article>`;
}

describe("ComparisonTable", () => {
  it("sorts a Big-O column ascending by complexity order", () => {
    table();
    render(<ComparisonTable wikiId="dsa" articlePath="ds/array" />);
    const timeHeader = document.querySelectorAll("th")[1] as HTMLElement;
    timeHeader.click();
    const firstCol = [...document.querySelectorAll("tbody tr td:first-child")].map(
      (c) => c.textContent,
    );
    expect(firstCol).toEqual(["Access", "Search", "Sort"]);
  });

  it("hides a column on toggle and persists the choice", () => {
    table();
    render(<ComparisonTable wikiId="dsa" articlePath="ds/array" />);
    const toggles = document.querySelectorAll(".table-col-toggle");
    const notesToggle = [...toggles].find((t) => t.textContent === "Notes") as HTMLButtonElement;
    notesToggle.click();
    expect(document.querySelector("td:nth-child(3)")?.classList.contains("table-col-hidden")).toBe(
      true,
    );
    expect(localStorage.getItem("wiki-table-cols-dsa-ds-array-Operation|Time|Notes")).toContain(
      "Notes",
    );
  });

  it("restores hidden columns on mount", () => {
    localStorage.setItem("wiki-table-cols-dsa-ds-array-Operation|Time|Notes", '["Notes"]');
    table();
    render(<ComparisonTable wikiId="dsa" articlePath="ds/array" />);
    expect(document.querySelector("td:nth-child(3)")?.classList.contains("table-col-hidden")).toBe(
      true,
    );
  });
});
