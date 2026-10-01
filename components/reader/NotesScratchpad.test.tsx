import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Notes } from "@/lib/storage/notes";
import { NotesScratchpad } from "./NotesScratchpad";

describe("NotesScratchpad", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it("typing saves to storage after the debounce", () => {
    const { getByPlaceholderText } = render(
      <NotesScratchpad wikiId="dsa" articlePath="content/dsa/x.md" />,
    );
    const textarea = getByPlaceholderText("Jot something down...");
    fireEvent.change(textarea, { target: { value: "my note" } });
    expect(Notes.get("dsa", "content/dsa/x.md")).toBe("");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(Notes.get("dsa", "content/dsa/x.md")).toBe("my note");
  });

  it("toggle collapses and persists the collapse flag", () => {
    const { container, getByLabelText } = render(
      <NotesScratchpad wikiId="dsa" articlePath="content/dsa/x.md" />,
    );
    const panel = container.querySelector(".notes-scratchpad");
    expect(panel?.classList.contains("notes-scratchpad--collapsed")).toBe(false);

    fireEvent.click(getByLabelText("Collapse notes"));
    expect(panel?.classList.contains("notes-scratchpad--collapsed")).toBe(true);
    expect(localStorage.getItem("wiki-notes-collapsed-dsa")).toBe("1");
  });

  it("unmounting before the debounce fires flushes the pending save", () => {
    const { getByPlaceholderText, unmount } = render(
      <NotesScratchpad wikiId="dsa" articlePath="content/dsa/x.md" />,
    );
    fireEvent.change(getByPlaceholderText("Jot something down..."), {
      target: { value: "typed then navigated away" },
    });
    unmount();
    expect(Notes.get("dsa", "content/dsa/x.md")).toBe("typed then navigated away");
  });

  it("pagehide before the debounce fires flushes the pending save", () => {
    const { getByPlaceholderText } = render(
      <NotesScratchpad wikiId="dsa" articlePath="content/dsa/x.md" />,
    );
    fireEvent.change(getByPlaceholderText("Jot something down..."), {
      target: { value: "typed then hard-navigated" },
    });
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(Notes.get("dsa", "content/dsa/x.md")).toBe("typed then hard-navigated");
  });

  it("remounting restores saved text and collapse state", () => {
    Notes.set("dsa", "content/dsa/x.md", "existing note");
    localStorage.setItem("wiki-notes-collapsed-dsa", "1");

    const { container, getByPlaceholderText } = render(
      <NotesScratchpad wikiId="dsa" articlePath="content/dsa/x.md" />,
    );
    expect((getByPlaceholderText("Jot something down...") as HTMLTextAreaElement).value).toBe(
      "existing note",
    );
    expect(container.querySelector(".notes-scratchpad--collapsed")).toBeTruthy();
  });
});
