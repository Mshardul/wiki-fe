import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodeCopy } from "./CodeCopy";

function articleWithCode() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <pre class="shiki has-line-numbers" data-code-origin="X">
        <div class="code-header"><div class="code-traffic-lights"></div></div>
        <code><span class="line code-line">const x = 1;</span></code>
        <button class="copy-btn" type="button" data-copy-target=""></button>
      </pre>
    </article>`;
}

describe("CodeCopy", () => {
  it("copies the code text and flashes the copied state", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    articleWithCode();
    render(<CodeCopy />);

    const btn = document.querySelector(".copy-btn") as HTMLButtonElement;
    expect(btn.querySelector("svg")).toBeTruthy();
    btn.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("const x = 1;");
    expect(btn.classList.contains("copied")).toBe(true);
  });

  it("toasts on clipboard failure", async () => {
    const { _resetToasts } = await import("@/lib/toast");
    _resetToasts();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
    });
    articleWithCode();
    render(<CodeCopy />);
    (document.querySelector(".copy-btn") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    // ToastHost isn't mounted here; assert the queue accepted it
    const { subscribeToast } = await import("@/lib/toast");
    let msg: string | undefined;
    subscribeToast((t) => {
      if (t) msg = t.message;
    });
    expect(msg).toBe("Couldn't copy to clipboard");
  });
});
