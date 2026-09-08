import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { VerticalIndex } from "@/lib/content/types";
import { markCompleted } from "@/lib/storage/completions";
import { LearningPathBars } from "./LearningPathBars";

const tracks: VerticalIndex["learningPaths"] = [
  {
    track: "Fundamentals",
    rows: [
      { title: "Array", slug: ["data-structures", "array"] },
      { title: "Hash Table", slug: ["data-structures", "hash-table"] },
      { title: "Linked List", slug: ["data-structures", "linked-list"] },
      { title: "Coming soon", slug: null },
    ],
  },
];

describe("LearningPathBars", () => {
  beforeEach(() => localStorage.clear());

  it("shows completed / total per track from local completions", () => {
    markCompleted("dsa", "content/dsa/data-structures/array.md");
    markCompleted("dsa", "content/dsa/data-structures/hash-table.md");
    render(<LearningPathBars wikiId="dsa" tracks={tracks} />);
    expect(screen.getByText("Fundamentals")).toBeTruthy();
    expect(screen.getByText("2/3")).toBeTruthy();
    const fill = document.querySelector(".learning-path-bar-fill") as HTMLElement;
    expect(fill.style.width).toBe("67%");
  });

  it("re-renders when completions change", () => {
    render(<LearningPathBars wikiId="dsa" tracks={tracks} />);
    expect(screen.getByText("0/3")).toBeTruthy();
    act(() => {
      markCompleted("dsa", "content/dsa/data-structures/array.md");
    });
    expect(screen.getByText("1/3")).toBeTruthy();
  });

  it("renders nothing without tracks", () => {
    const { container } = render(<LearningPathBars wikiId="dsa" tracks={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
