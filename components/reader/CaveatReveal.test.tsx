import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CaveatReveal } from "./CaveatReveal";

function withCaveat() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <p>text
        <span class="caveat-marker" role="button" tabindex="0" aria-expanded="false">
          <span class="caveat-body" aria-hidden="true">the caveat</span>
        </span>
      </p>
    </article>`;
}

describe("CaveatReveal", () => {
  it("toggles the caveat body on click", () => {
    withCaveat();
    render(<CaveatReveal />);
    const marker = document.querySelector(".caveat-marker") as HTMLElement;
    const body = document.querySelector(".caveat-body") as HTMLElement;

    fireEvent.click(marker);
    expect(marker.getAttribute("aria-expanded")).toBe("true");
    expect(body.getAttribute("aria-hidden")).toBe("false");

    fireEvent.click(marker);
    expect(marker.getAttribute("aria-expanded")).toBe("false");
  });

  it("toggles on Enter and Space", () => {
    withCaveat();
    render(<CaveatReveal />);
    const marker = document.querySelector(".caveat-marker") as HTMLElement;
    fireEvent.keyDown(marker, { key: "Enter" });
    expect(marker.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(marker, { key: " " });
    expect(marker.getAttribute("aria-expanded")).toBe("false");
  });
});
