import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { closeTopmost } from "@/components/common/modalRegistry";
import { TocDrawer } from "./TocDrawer";

beforeEach(() => {
  document.body.innerHTML = `
    <aside id="toc-sidebar" class="toc-sidebar">
      <nav id="toc-nav"><a class="toc-item" href="#a">A</a></nav>
    </aside>`;
});

describe("TocDrawer", () => {
  it("the FAB opens the drawer and toggles the classes", () => {
    render(<TocDrawer />);
    const btn = document.getElementById("toc-mobile-btn") as HTMLButtonElement;
    fireEvent.click(btn);
    expect(document.getElementById("toc-sidebar")?.classList.contains("mobile-open")).toBe(true);
    expect(document.body.classList.contains("toc-open")).toBe(true);
    expect(document.getElementById("toc-mobile-backdrop")?.classList.contains("hidden")).toBe(
      false,
    );
  });

  it("backdrop click and Escape close it", () => {
    render(<TocDrawer />);
    fireEvent.click(document.getElementById("toc-mobile-btn") as Element);
    fireEvent.click(document.getElementById("toc-mobile-backdrop") as Element);
    expect(document.getElementById("toc-sidebar")?.classList.contains("mobile-open")).toBe(false);

    fireEvent.click(document.getElementById("toc-mobile-btn") as Element);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.classList.contains("toc-open")).toBe(false);
  });

  it("closeTopmost from the modal registry closes the drawer first", () => {
    render(<TocDrawer />);
    fireEvent.click(document.getElementById("toc-mobile-btn") as Element);
    let closed = false;
    act(() => {
      closed = closeTopmost();
    });
    expect(closed).toBe(true);
    expect(document.getElementById("toc-sidebar")?.classList.contains("mobile-open")).toBe(false);
  });

  it("clicking a TOC item closes the drawer", () => {
    render(<TocDrawer />);
    fireEvent.click(document.getElementById("toc-mobile-btn") as Element);
    fireEvent.click(document.querySelector(".toc-item") as Element);
    expect(document.body.classList.contains("toc-open")).toBe(false);
  });

  it("wiki:open-toc-drawer opens it when there are TOC items", () => {
    render(<TocDrawer />);
    act(() => {
      document.dispatchEvent(new CustomEvent("wiki:open-toc-drawer"));
    });
    expect(document.getElementById("toc-sidebar")?.classList.contains("mobile-open")).toBe(true);
  });
});
