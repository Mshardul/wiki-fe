import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const initialize = vi.fn();
const run = vi.fn().mockResolvedValue(undefined);
vi.mock("mermaid", () => ({ default: { initialize, run } }));

import { MermaidDiagrams } from "./MermaidDiagrams";

afterEach(() => {
  initialize.mockClear();
  run.mockClear();
});

function withDiagram() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <pre class="mermaid" data-mermaid-src="graph TD; A--&gt;B">graph TD; A--&gt;B</pre>
    </article>`;
}

describe("MermaidDiagrams", () => {
  it("initializes and runs mermaid over the pre.mermaid blocks on mount", async () => {
    withDiagram();
    render(<MermaidDiagrams />);
    await vi.waitFor(() => expect(run).toHaveBeenCalled());
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, theme: "base" }),
    );
    expect(run).toHaveBeenCalledWith({ nodes: expect.any(Array) });
  });

  it("re-renders on a wiki:theme-changed event", async () => {
    withDiagram();
    render(<MermaidDiagrams />);
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    document.dispatchEvent(new CustomEvent("wiki:theme-changed"));
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2));
  });

  it("does nothing without diagrams", () => {
    document.body.innerHTML = `<article class="markdown-body"><p>no diagrams</p></article>`;
    render(<MermaidDiagrams />);
    expect(run).not.toHaveBeenCalled();
  });
});
