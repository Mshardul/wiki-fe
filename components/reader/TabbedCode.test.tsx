import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabbedCode } from "./TabbedCode";

function tabbed() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <div class="tabbed-code" data-tabs-id="ex" data-tabs-title="Example">
        <pre><code class="language-python">print(1)</code></pre>
        <pre><code class="language-javascript">console.log(1)</code></pre>
      </div>
    </article>`;
}

describe("TabbedCode", () => {
  it("builds a tablist and shows the first panel", () => {
    tabbed();
    render(<TabbedCode />);
    const widget = document.querySelector(".code-tabs") as HTMLElement;
    expect(widget).toBeTruthy();
    const tabs = widget.querySelectorAll(".code-tab");
    expect([...tabs].map((t) => t.textContent)).toEqual(["python", "javascript"]);
    const panels = widget.querySelectorAll<HTMLElement>(".code-tab-panel");
    expect(panels[0]!.hidden).toBe(false);
    expect(panels[1]!.hidden).toBe(true);
  });

  it("switches the visible panel on tab click and remembers the language", () => {
    tabbed();
    render(<TabbedCode />);
    const tab2 = document.querySelectorAll(".code-tab")[1] as HTMLButtonElement;
    tab2.click();
    const panels = document.querySelectorAll<HTMLElement>(".code-tab-panel");
    expect(panels[0]!.hidden).toBe(true);
    expect(panels[1]!.hidden).toBe(false);
    expect(sessionStorage.getItem("tabs-last-lang")).toBe("javascript");
  });

  it("leaves a single-block wrapper alone", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <div class="tabbed-code" data-tabs-id="one">
          <pre><code class="language-python">print(1)</code></pre>
        </div>
      </article>`;
    render(<TabbedCode />);
    expect(document.querySelector(".code-tabs")).toBeNull();
    expect(document.querySelector(".tabbed-code")).toBeTruthy();
  });
});
